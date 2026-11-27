import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { GeminiService, IParsedApartmentData } from '../ingestion/gemini.service.js';
import { escapeRegex, maskPhonesInText } from '../../utils/phone-text.js';
import { toVnPhone } from '../../utils/validators.js';
import { NotificationService } from '../notifications/notification.service.js';
import { sameDistrict, sameStreet, streetKey } from './street-key.js';
import { PHashUtil } from './phash.util.js';
import { IProcessListingInput } from './dedup.types.js';
import { recordIngestion } from '../ingestion/ingestion-event.model.js';
import { applyReviewPolicy } from './review-policy.js';
import { compareUnit, unitOfApartment, UnitSignature } from './unit-signature.js';
import { createMasterApartment, downloadImages } from './create-master.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VISUAL_MATCH_DAYS = 180; // So ảnh chỉ với căn còn "sống" gần đây — không quét cả kho
const VISUAL_MATCH_LIMIT = 500;
const POSSIBLE_DUPLICATE_REASON = 'Có thể trùng căn của cùng SĐT — tin chưa có tên đường';
export const POSSIBLE_SAME_UNIT_REASON = 'Có thể trùng căn';
const SOURCE_AVAILABLE_REASON = 'Nguồn mới báo còn trống — kiểm tra trạng thái';
// Căn master đã gộp: mã, tên, giá, ảnh đại diện (KHÔNG kèm SĐT chủ nhà, KHÔNG lấy ảnh dán SĐT nguồn — kết quả có thể trả ra webhook bên ngoài)
const masterSummary = (master: IApartment) => ({
  _id: master._id,
  title: master.title,
  price: master.price,
  image: master.images?.find((url) => !master.hiddenImages?.includes(url)),
});
// Story 20.2: lý do gộp bằng lời cho người dán tin
const unitText = (apt: IApartment) =>
  [apt.attributes.bedrooms === 0 ? 'Studio' : `${apt.attributes.bedrooms} PN`, apt.attributes.area && `${apt.attributes.area} m²`].filter(Boolean).join(' / ');

/** Chữ ký căn của tin AI vừa bóc — số PN chỉ tính khi tin ghi rõ (Story 20.1). */
const unitOfParsed =(ext: IParsedApartmentData): UnitSignature => ({
  propertyType: ext.propertyType,
  bedrooms: ext.bedroomsStated ? ext.bedrooms : undefined,
  area: ext.area,
  buildingName: ext.buildingName,
  unitLabel: ext.unitLabel,
});

export class DedupService {
  /** Điều kiện tìm căn có SĐT chủ (căn Master hoặc nguồn phụ). */
  private static phoneQuery(phone: string, excludeId?: string) {
    return {
      $or: [{ 'ownerContact.phone': phone }, { 'subListings.ownerContact.phone': phone }],
      ...(excludeId && { _id: { $ne: excludeId } }),
    };
  }

  /**
   * Tầng 1: cùng SĐT chủ + cùng quận + cùng TÊN ĐƯỜNG (Story 14.2) + cùng "chữ ký căn" (Story 20.1).
   * Môi giới hay có nhiều căn trong CÙNG TÒA → phải so thêm loại căn, số PN, diện tích, tên tòa, số phòng:
   * - match: căn đầu tiên khớp chữ ký (SAME) → gộp được;
   * - uncertain: không đủ dữ liệu để phân biệt (UNKNOWN) → KHÔNG tự gộp, chỉ gắn cờ cho Quản lý.
   * Tin chưa có tên đường → không tự gộp (xem runPipeline).
   */
  public static async checkDeterministicMatch(
    phone: string,
    street: string,
    district: string,
    unit: UnitSignature = {},
    excludeId?: string
  ): Promise<{ match?: IApartment; uncertain?: IApartment }> {
    const cleanPhone = toVnPhone(phone); // Story 14.1: "+84 905…" phải khớp "0905…" đã lưu
    if (!cleanPhone || !streetKey(street)) return {};
    const candidates = await Apartment.find(this.phoneQuery(cleanPhone, excludeId));
    let uncertain: IApartment | undefined;
    for (const apt of candidates) {
      if (!sameDistrict(district, apt.location.district) || !sameStreet(street, apt.location.street || apt.location.address)) continue;
      const result = compareUnit(unit, unitOfApartment(apt));
      if (result === 'SAME') return { match: apt };
      if (result === 'UNKNOWN') uncertain ??= apt;
    }
    return { uncertain };
  }

  /** Đã có căn mang SĐT chủ này chưa (tin chưa có tên đường → gắn cờ "có thể trùng" thay vì tự gộp). */
  private static async hasPhoneOwner(phone: string) {
    const cleanPhone = toVnPhone(phone);
    return Boolean(cleanPhone && (await Apartment.exists(this.phoneQuery(cleanPhone))));
  }

  /**
   * Tầng 2: So khớp ảnh bằng dHash 64-bit. Story 14.2: bỏ qua ảnh trơn / banner (hash không đặc trưng),
   * chỉ xét căn cùng quận (nguyên tên) cập nhật trong 180 ngày.
   * Story 20.1: căn khác chữ ký (khác PN / loại / tòa…) bị bỏ qua — ảnh sảnh, hồ bơi chung tòa dễ trùng giữa các căn.
   */
  public static async checkVisualMatch(
    newImageHashes: string[],
    district: string,
    unit: UnitSignature = {}
  ): Promise<{ matchedApartment: IApartment; matchedCount: number } | null> {
    const hashes = newImageHashes.filter(PHashUtil.isInformative);
    if (hashes.length === 0) return null;

    const query: Record<string, unknown> = {
      'imageHashes.0': { $exists: true },
      updatedAt: { $gte: new Date(Date.now() - VISUAL_MATCH_DAYS * DAY_MS) },
    };
    // district do AI bóc tách từ tin public → phải escape regex; neo ^$ để không khớp chuỗi con
    if (district) query['location.district'] = new RegExp(`^${escapeRegex(district.trim())}$`, 'i');

    // Chỉ lấy trường cần so; tải đầy đủ document cho căn khớp duy nhất ở cuối.
    // Story 19.11: giới hạn 500 căn mới cập nhật gần nhất cùng quận (không tải cả kho vào bộ nhớ)
    const candidates = await Apartment.find(query)
      .sort({ updatedAt: -1 })
      .limit(VISUAL_MATCH_LIMIT)
      .select('imageHashes attributes location.buildingName location.unitLabel')
      .lean<IApartment[]>();

    // Khớp khi có >= 2 ảnh trùng (hoặc 1 ảnh nếu bài chỉ có 1 ảnh duy nhất)
    const threshold = hashes.length === 1 ? 1 : 2;
    for (const apt of candidates) {
      if (compareUnit(unit, unitOfApartment(apt)) === 'DIFFERENT') continue;
      const existingHashes = (apt.imageHashes || []).filter(PHashUtil.isInformative);
      // Ghép 1-1: mỗi ảnh cũ chỉ khớp 1 ảnh mới — 3 góc chụp giống nhau của tin mới không được tính là 3 ảnh trùng với CÙNG 1 ảnh cũ
      const used = new Set<number>();
      const matchCount = hashes.filter((newHash) => {
        const index = existingHashes.findIndex((oldHash, i) => !used.has(i) && PHashUtil.isMatch(newHash, oldHash, 8));
        if (index === -1) return false;
        used.add(index);
        return true;
      }).length;
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
    const unit = unitOfParsed(ext);

    // Ảnh tải muộn (Telegram): chỉ đẩy lên Cloudinary khi tin đã qua bộ lọc rác
    if (!input.mediaUrls && input.loadMediaUrls) input = { ...input, mediaUrls: await input.loadMediaUrls() };

    // Bước 2: Tải ảnh 1 lần và tính mã pHash
    const mediaUrls = input.mediaUrls || [];
    const { imageHashes: newImageHashes, downloadedImages } = await downloadImages(mediaUrls);

    // Bước 3: Khử trùng lặp Tầng 1 (SĐT + tên đường + chữ ký căn)
    const { match: detMatch, uncertain } = await this.checkDeterministicMatch(ext.ownerContact.phone, ext.street || '', ext.district, unit);
    if (detMatch) {
      const subListingId = await this.mergeIntoMaster(detMatch, input, ext);
      return {
        isRentalListing: true,
        isDuplicate: true,
        masterApartmentId: detMatch._id,
        subListingId,
        apartment: masterSummary(detMatch), // Story 19.2: Nhật ký / phản hồi có tên căn đã gộp
        matchReason: `Cùng SĐT chủ & tên đường, cùng ${unitText(detMatch)}`,
        matchType: 'DETERMINISTIC',
        confidence: 100,
        message: 'Đã phát hiện trùng lặp theo SĐT & Địa chỉ. Tự động gộp vào căn Master.',
      };
    }

    // Bước 4: Khử trùng lặp Tầng 2 (Thị giác ảnh pHash)
    if (newImageHashes.length > 0) {
      const visMatch = await this.checkVisualMatch(newImageHashes, ext.district, unit);
      if (visMatch) {
        const subListingId = await this.mergeIntoMaster(visMatch.matchedApartment, input, ext);
        return {
          isRentalListing: true,
          isDuplicate: true,
          masterApartmentId: visMatch.matchedApartment._id,
          subListingId,
          apartment: masterSummary(visMatch.matchedApartment),
          matchReason: `Trùng ${visMatch.matchedCount} ảnh phòng`,
          matchType: 'IMAGE_PHASH',
          confidence: 90,
          matchedImagesCount: visMatch.matchedCount,
          message: 'Đã phát hiện trùng lặp hình ảnh phòng (pHash). Tự động gộp vào căn Master.',
        };
      }
    }

    // Bước 5: Tin mới → tạo Master. Gắn cờ "có thể trùng" thay vì tự gộp khi:
    // - Story 20.1: cùng SĐT + đường nhưng không đủ dữ liệu phân biệt căn;
    // - Story 14.2: tin chưa có tên đường mà SĐT đã có căn.
    const review = uncertain
      ? { needsReview: true, reviewReason: `${POSSIBLE_SAME_UNIT_REASON}: ${maskPhonesInText(uncertain.title)}` }
      : !streetKey(ext.street) && (await this.hasPhoneOwner(ext.ownerContact.phone))
        ? { needsReview: true, reviewReason: POSSIBLE_DUPLICATE_REASON }
        : await applyReviewPolicy(ext); // Story 13.5: cờ "cần kiểm tra" theo chính sách Admin chọn

    const newApartment = await createMasterApartment(input, { ext, mediaUrls, imageHashes: newImageHashes, downloadedImages, review });
    return {
      isRentalListing: true,
      isDuplicate: false,
      apartmentId: newApartment._id,
      apartment: newApartment,
      ...(uncertain && { possibleDuplicateOf: masterSummary(uncertain) }),
      message: uncertain
        ? 'Đã thêm căn mới — có thể trùng căn cùng chủ, cùng đường (đã gắn cờ để Quản lý kiểm tra).'
        : 'Tin căn hộ mới độc lập đã được thêm vào Bảng hàng.',
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
    const subListingId = await this.aggregateSubListing(master, input, ext);
    if (!wasTaken) return subListingId;
    NotificationService.notifyManagers({
      type: 'SOURCE_AVAILABLE_AGAIN',
      title: 'Căn đã cọc / đã thuê được đăng lại',
      body: `${maskPhonesInText(master.title)}: ${SOURCE_AVAILABLE_REASON}`,
      apartmentId: String(master._id),
    }).catch(() => undefined); // Lỗi gửi thông báo không làm hỏng việc nhập tin
    return subListingId;
  }

  /**
   * Thêm tin làm nguồn phụ của căn Master, trả mã nguồn vừa thêm (Story 20.2: để tách lại nếu gộp nhầm).
   * Story 14.2: KHÔNG cộng hash ảnh nguồn phụ vào Master (càng cộng càng dễ gộp nhầm).
   */
  public static async aggregateSubListing(master: IApartment, input: IProcessListingInput, ext: { price: number; ownerContact: unknown }) {
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
    return String(master.subListings.at(-1)!._id);
  }
}
