import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { GeminiService } from '../ingestion/gemini.service.js';
import { GeminiVisionService } from '../ingestion/gemini-vision.service.js';
import { fetchImageBuffer } from '../../utils/fetch-image.js';
import { escapeRegex, maskPhonesInText } from '../../utils/phone-text.js';
import { toVnPhone } from '../../utils/validators.js';
import { NotificationService } from '../notifications/notification.service.js';
import { sameDistrict, sameStreet, streetKey } from './street-key.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { geocodeStreet } from '../search/street-geocoder.js';
import { PHashUtil } from './phash.util.js';
import { IProcessListingInput } from './dedup.types.js';
import { recordIngestion } from '../ingestion/ingestion-event.model.js';
import { applyReviewPolicy } from './review-policy.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VISUAL_MATCH_DAYS = 180; // So ảnh chỉ với căn còn "sống" gần đây — không quét cả kho
const POSSIBLE_DUPLICATE_REASON = 'Có thể trùng căn của cùng SĐT — tin chưa có tên đường';
const SOURCE_AVAILABLE_REASON = 'Nguồn mới báo còn trống — kiểm tra trạng thái';

export class DedupService {
  /** Điều kiện tìm căn có SĐT chủ (căn Master hoặc nguồn phụ). */
  private static phoneQuery(phone: string, excludeId?: string) {
    return {
      $or: [{ 'ownerContact.phone': phone }, { 'subListings.ownerContact.phone': phone }],
      ...(excludeId && { _id: { $ne: excludeId } }),
    };
  }

  /**
   * Tầng 1: cùng SĐT chủ + cùng quận + cùng TÊN ĐƯỜNG (Story 14.2).
   * Trước đây chỉ cần chung 1 từ bất kỳ trong địa chỉ ("kiet", "van", "nguyen") → gộp nhầm các căn khác nhau của cùng môi giới.
   * Tin chưa có tên đường → không tự gộp (xem runPipeline).
   */
  public static async checkDeterministicMatch(phone: string, street: string, district: string, excludeId?: string): Promise<IApartment | null> {
    const cleanPhone = toVnPhone(phone); // Story 14.1: "+84 905…" phải khớp "0905…" đã lưu
    if (!cleanPhone || !streetKey(street)) return null;
    const candidates = await Apartment.find(this.phoneQuery(cleanPhone, excludeId));
    return (
      candidates.find((apt) => sameDistrict(district, apt.location.district) && sameStreet(street, apt.location.street || apt.location.address)) ||
      null
    );
  }

  /** Đã có căn mang SĐT chủ này chưa (tin chưa có tên đường → gắn cờ "có thể trùng" thay vì tự gộp). */
  private static async hasPhoneOwner(phone: string) {
    const cleanPhone = toVnPhone(phone);
    return Boolean(cleanPhone && (await Apartment.exists(this.phoneQuery(cleanPhone))));
  }

  /**
   * Tầng 2: So khớp ảnh bằng dHash 64-bit. Story 14.2: bỏ qua ảnh trơn / banner (hash không đặc trưng),
   * chỉ xét căn cùng quận (nguyên tên) cập nhật trong 180 ngày.
   */
  public static async checkVisualMatch(
    newImageHashes: string[],
    district: string
  ): Promise<{ matchedApartment: IApartment; matchedCount: number } | null> {
    const hashes = newImageHashes.filter(PHashUtil.isInformative);
    if (hashes.length === 0) return null;

    const query: Record<string, unknown> = {
      'imageHashes.0': { $exists: true },
      updatedAt: { $gte: new Date(Date.now() - VISUAL_MATCH_DAYS * DAY_MS) },
    };
    // district do AI bóc tách từ tin public → phải escape regex; neo ^$ để không khớp chuỗi con
    if (district) query['location.district'] = new RegExp(`^${escapeRegex(district.trim())}$`, 'i');

    // Chỉ lấy imageHashes để so sánh; tải đầy đủ document cho căn khớp duy nhất ở cuối
    const candidates = await Apartment.find(query).select('imageHashes').lean();

    // Khớp khi có >= 2 ảnh trùng (hoặc 1 ảnh nếu bài chỉ có 1 ảnh duy nhất)
    const threshold = hashes.length === 1 ? 1 : 2;
    for (const apt of candidates) {
      const existingHashes = (apt.imageHashes || []).filter(PHashUtil.isInformative);
      const matchCount = hashes.filter((newHash) => existingHashes.some((oldHash) => PHashUtil.isMatch(newHash, oldHash, 8))).length;
      if (matchCount >= threshold) {
        const matchedApartment = await Apartment.findById(apt._id);
        if (matchedApartment) return { matchedApartment, matchedCount: matchCount };
      }
    }
    return null;
  }

  /** Nhập 1 tin (mọi cổng: Telegram, webhook, extension, dán nhanh) + ghi thống kê cho Dashboard (Story 13.1). */
  public static async processListing(input: IProcessListingInput): Promise<any> {
    try {
      const result = await this.runPipeline(input);
      recordIngestion(!result.isRentalListing ? 'NOT_RENTAL' : result.isDuplicate ? 'MERGED_DUPLICATE' : 'CREATED', input.sourceType, input.sourceChatId);
      return result;
    } catch (err) {
      recordIngestion('FAILED', input.sourceType, input.sourceChatId);
      throw err;
    }
  }

  /**
   * Toàn bộ Pipeline: Nhận tin -> Gemini Parse -> Lọc Rác -> Khử trùng 2 tầng -> Gộp Sub hoặc Tạo Master
   */
  private static async runPipeline(input: IProcessListingInput): Promise<any> {
    // Bước 1: Gemini AI bóc tách và phân loại ý định
    const parseResult = await GeminiService.parseRealEstatePost(input.rawText);

    if (!parseResult.isRentalListing || !parseResult.extracted) {
      return {
        isRentalListing: false,
        rejectReason: parseResult.rejectReason || 'Tin đăng bị loại bỏ bởi bộ lọc rác (Noise Filter)',
      };
    }

    const ext = parseResult.extracted;

    // Ảnh tải muộn (Telegram): chỉ đẩy lên Cloudinary khi tin đã qua bộ lọc rác
    if (!input.mediaUrls && input.loadMediaUrls) input = { ...input, mediaUrls: await input.loadMediaUrls() };

    // Bước 2: Tải ảnh 1 lần và tính mã pHash (ảnh đã tải được dùng lại cho Gemini Vision ở Bước 5)
    const mediaUrls = input.mediaUrls || [];
    const newImageHashes: string[] = [];
    const downloadedImages: { url: string; buffer: Buffer }[] = [];

    for (const url of mediaUrls) {
      try {
        const buffer = await fetchImageBuffer(url);
        const hash = await PHashUtil.computeDHash(buffer); // ảnh hỏng sẽ lỗi ở đây và bị bỏ qua
        if (PHashUtil.isInformative(hash)) newImageHashes.push(hash); // Story 14.2: ảnh trơn / banner không dùng để so trùng
        downloadedImages.push({ url, buffer });
      } catch (_e) {
        // Bỏ qua lỗi nếu 1 ảnh không tải được
      }
    }

    // Bước 3: Khử trùng lặp Tầng 1 (SĐT + tên đường)
    const detMatch = await this.checkDeterministicMatch(ext.ownerContact.phone, ext.street || '', ext.district);
    if (detMatch) {
      await this.mergeIntoMaster(detMatch, input, ext);
      return {
        isRentalListing: true,
        isDuplicate: true,
        masterApartmentId: detMatch._id,
        matchType: 'DETERMINISTIC',
        confidence: 100,
        message: 'Đã phát hiện trùng lặp theo SĐT & Địa chỉ. Tự động gộp vào căn Master.',
      };
    }

    // Bước 4: Khử trùng lặp Tầng 2 (Thị giác ảnh pHash)
    if (newImageHashes.length > 0) {
      const visMatch = await this.checkVisualMatch(newImageHashes, ext.district);
      if (visMatch) {
        await this.mergeIntoMaster(visMatch.matchedApartment, input, ext);
        return {
          isRentalListing: true,
          isDuplicate: true,
          masterApartmentId: visMatch.matchedApartment._id,
          matchType: 'IMAGE_PHASH',
          confidence: 90,
          matchedImagesCount: visMatch.matchedCount,
          message: 'Đã phát hiện trùng lặp hình ảnh phòng (pHash). Tự động gộp vào căn Master.',
        };
      }
    }

    // Bước 5: Tin hoàn toàn mới -> Gemini Vision đánh dấu ảnh dán SĐT nguồn cũ (Story 5.2) -> Tạo Master
    const phoneImageIndexes = await GeminiVisionService.detectImagesWithPhone(downloadedImages.map((img) => img.buffer));
    // Gắn tọa độ: tên đường (Story 15.6) → điểm mốc trong địa chỉ → tâm khu vực, để tin nhập tự động cũng tìm được theo bán kính
    const fromStreet = await geocodeStreet(ext.street, ext.district);
    const geo = fromStreet ? null : GeocodingService.resolveCoordinates(ext.address) || GeocodingService.resolveCoordinates(ext.district);
    // Story 14.2: tin chưa có tên đường không tự gộp theo SĐT → tạo căn mới nhưng báo Quản lý kiểm tra
    const review =
      !streetKey(ext.street) && (await this.hasPhoneOwner(ext.ownerContact.phone))
        ? { needsReview: true, reviewReason: POSSIBLE_DUPLICATE_REASON }
        : await applyReviewPolicy(ext); // Story 13.5: cờ "cần kiểm tra" theo chính sách Admin chọn

    const newApartment = await Apartment.create({
      title: ext.title,
      description: input.rawText,
      price: ext.price,
      priceUsd: ext.priceUsd,
      minLeaseMonths: ext.minLeaseMonths,
      includedServices: ext.includedServices,
      location: {
        address: ext.address,
        street: ext.street,
        houseNumber: ext.houseNumber,
        zone: ext.zone,
        ward: ext.ward,
        district: ext.district,
        city: ext.city,
        coordinates: fromStreet ?? geo?.coordinates,
        geoPrecision: fromStreet ? 'STREET' : geo ? 'AREA' : undefined,
      },
      attributes: {
        propertyType: ext.propertyType,
        area: ext.area,
        bedrooms: ext.bedrooms,
        bathrooms: ext.bathrooms,
        furnishing: ext.furnishing,
        elevator: ext.elevator,
        allowPets: ext.allowPets,
        carParking: ext.carParking,
        pcccStandard: ext.pcccStandard,
        pool: ext.pool,
        distanceToBeachM: ext.distanceToBeachM,
        motorbikeParking: ext.motorbikeParking,
        gym: ext.gym,
        bathtub: ext.bathtub,
        riverView: ext.riverView,
        seaView: ext.seaView,
        sauna: ext.sauna,
        balcony: false,
        washingMachine: 'SHARED',
      },
      fees: ext.fees,
      images: mediaUrls,
      imageHashes: newImageHashes,
      hiddenImages: phoneImageIndexes.map((index) => downloadedImages[index].url),
      ownerContact: ext.ownerContact,
      subListings: [
        {
          sourceType: input.sourceType,
          sourceName: input.sourceName || 'Chính chủ đăng',
          sourceUrl: input.sourceUrl,
          price: ext.price,
          ownerContact: ext.ownerContact,
          images: mediaUrls,
          rawContent: input.rawText,
          postedAt: new Date(),
        },
      ],
      // Tin cần kiểm tra vẫn là "Trống" — chỉ gắn cờ cho Quản lý (trước đây bị đổi sai thành "Sắp trống")
      status: 'AVAILABLE',
      ...review,
      managerId: input.managerId,
    });

    LeadMatchingService.runInBackground(newApartment); // Story 6.3: báo CTV có khách phù hợp
    publishApartmentEvent('apartment.created', newApartment); // Story 11.4: CTV đang mở app thấy căn mới ngay
    return {
      isRentalListing: true,
      isDuplicate: false,
      apartmentId: newApartment._id,
      apartment: newApartment,
      message: 'Tin căn hộ mới độc lập đã được thêm vào Bảng hàng.',
    };
  }

  /**
   * Bot tự gộp tin trùng (Story 14.2): căn Master đang Đã cọc / Đã thuê mà nguồn mới đăng lại = có thể đã trống
   * → gắn cờ cho Quản lý + báo cả đội 1 lần (căn đã có cờ thì không báo lại, tránh spam khi môi giới đăng lại nhiều lần).
   * Quản lý tự chọn "gộp" khi duyệt tin CTV gọi thẳng aggregateSubListing, không đi qua đây.
   */
  private static async mergeIntoMaster(master: IApartment, input: IProcessListingInput, ext: { price: number; ownerContact: unknown }) {
    const wasTaken = (master.status === 'DEPOSITED' || master.status === 'RENTED') && !master.needsReview;
    if (wasTaken) master.set({ needsReview: true, reviewReason: SOURCE_AVAILABLE_REASON });
    await this.aggregateSubListing(master, input, ext);
    if (!wasTaken) return;
    NotificationService.notifyManagers({
      type: 'SOURCE_AVAILABLE_AGAIN',
      title: 'Căn đã cọc / đã thuê được đăng lại',
      body: `${maskPhonesInText(master.title)}: ${SOURCE_AVAILABLE_REASON}`,
      apartmentId: String(master._id),
    }).catch(() => undefined); // Lỗi gửi thông báo không làm hỏng việc nhập tin
  }

  /** Thêm tin làm nguồn phụ của căn Master. Story 14.2: KHÔNG cộng hash ảnh nguồn phụ vào Master (càng cộng càng dễ gộp nhầm). */
  public static async aggregateSubListing(master: IApartment, input: IProcessListingInput, ext: { price: number; ownerContact: unknown }): Promise<void> {
    master.subListings.push({
      sourceType: input.sourceType,
      sourceName: input.sourceName || 'Nguồn tham chiếu mới',
      sourceUrl: input.sourceUrl,
      price: ext.price,
      ownerContact: ext.ownerContact,
      images: input.mediaUrls || [],
      rawContent: input.rawText,
      postedAt: new Date(),
    } as any);
    master.updatedAt = new Date();
    await master.save();
  }
}

