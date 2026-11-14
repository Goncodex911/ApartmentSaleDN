import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { GeminiService } from '../ingestion/gemini.service.js';
import { GeminiVisionService } from '../ingestion/gemini-vision.service.js';
import { fetchImageBuffer } from '../../utils/fetch-image.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { removeVietnameseTones } from '../../utils/vietnamese.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';
import { PHashUtil } from './phash.util.js';
import { IProcessListingInput } from './dedup.types.js';

export class DedupService {
  /**
   * Chuẩn hóa chuỗi địa chỉ để so khớp (bỏ dấu tiếng Việt, chữ thường, bỏ ký tự đặc biệt)
   */
  public static normalizeText(text: string): string {
    if (!text) return '';
    // removeVietnameseTones \u0111\u1ed5i c\u1ea3 "\u0111" \u2192 "d" (NFD kh\u00f4ng t\u00e1ch \u0111\u01b0\u1ee3c "\u0111": tr\u01b0\u1edbc \u0111\u00e2y "\u0110\u1ed1ng \u0110a" th\u00e0nh "ong a")
    return removeVietnameseTones(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Tầng 1: So khớp định danh (Trùng SĐT VÀ trùng tên đường/ngõ)
   */
  public static async checkDeterministicMatch(
    phone: string,
    address: string,
    district: string
  ): Promise<IApartment | null> {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 8) return null;

    // Tìm các căn hộ có SĐT đầu mối trùng khớp (trong Master hoặc SubListings)
    const candidates = await Apartment.find({
      $or: [
        { 'ownerContact.phone': cleanPhone },
        { 'subListings.ownerContact.phone': cleanPhone },
      ],
    });

    if (candidates.length === 0) return null;

    const normDistrict = this.normalizeText(district);
    const normAddress = this.normalizeText(address);

    for (const apt of candidates) {
      const aptDistrict = this.normalizeText(apt.location.district);
      const aptAddress = this.normalizeText(apt.location.address);

      // Nếu cùng Quận và có chung từ khóa tên đường
      const sameDistrict = !normDistrict || !aptDistrict || normDistrict.includes(aptDistrict) || aptDistrict.includes(normDistrict);
      if (sameDistrict) {
        // Tách các từ đơn có nghĩa (> 3 ký tự) để so khớp tên đường
        const words = normAddress.split(' ').filter((w) => w.length > 2 && !['ngo', 'ngach', 'so', 'nha', 'pho', 'duong'].includes(w));
        const matchedWord = words.find((w) => aptAddress.includes(w));
        if (matchedWord) {
          return apt;
        }
      }
    }

    return null;
  }

  /**
   * Tầng 2: So khớp thị giác ảnh bằng pHash 64-bit
   */
  public static async checkVisualMatch(
    newImageHashes: string[],
    district: string
  ): Promise<{ matchedApartment: IApartment; matchedCount: number } | null> {
    if (!newImageHashes || newImageHashes.length === 0) return null;

    // Tìm các căn hộ trong cùng quận có lưu imageHashes (district do AI bóc tách từ tin public → phải escape regex)
    const query: any = { 'imageHashes.0': { $exists: true } };
    if (district) {
      query['location.district'] = new RegExp(escapeRegex(district.trim()), 'i');
    }

    // Chỉ lấy imageHashes để so sánh; tải đầy đủ document cho căn khớp duy nhất ở cuối
    const candidates = await Apartment.find(query).select('imageHashes').lean();

    // Khớp khi có >= 2 ảnh trùng (hoặc 1 ảnh nếu bài chỉ có 1 ảnh duy nhất)
    const threshold = newImageHashes.length === 1 ? 1 : 2;
    for (const apt of candidates) {
      const existingHashes = apt.imageHashes || [];
      const matchCount = newImageHashes.filter((newHash) =>
        existingHashes.some((oldHash) => PHashUtil.isMatch(newHash, oldHash, 8))
      ).length;
      if (matchCount >= threshold) {
        const matchedApartment = await Apartment.findById(apt._id);
        if (matchedApartment) return { matchedApartment, matchedCount: matchCount };
      }
    }

    return null;
  }

  /**
   * Toàn bộ Pipeline: Nhận tin -> Gemini Parse -> Lọc Rác -> Khử trùng 2 tầng -> Gộp Sub hoặc Tạo Master
   */
  public static async processListing(input: IProcessListingInput): Promise<any> {
    // Bước 1: Gemini AI bóc tách và phân loại ý định
    const parseResult = await GeminiService.parseRealEstatePost(input.rawText);

    if (!parseResult.isRentalListing || !parseResult.extracted) {
      return {
        isRentalListing: false,
        rejectReason: parseResult.rejectReason || 'Tin đăng bị loại bỏ bởi bộ lọc rác (Noise Filter)',
      };
    }

    const ext = parseResult.extracted;

    // Bước 2: Tải ảnh 1 lần và tính mã pHash (ảnh đã tải được dùng lại cho Gemini Vision ở Bước 5)
    const mediaUrls = input.mediaUrls || [];
    const newImageHashes: string[] = [];
    const downloadedImages: { url: string; buffer: Buffer }[] = [];

    for (const url of mediaUrls) {
      try {
        const buffer = await fetchImageBuffer(url);
        newImageHashes.push(await PHashUtil.computeDHash(buffer)); // ảnh hỏng sẽ lỗi ở đây và bị bỏ qua
        downloadedImages.push({ url, buffer });
      } catch (_e) {
        // Bỏ qua lỗi nếu 1 ảnh không tải được
      }
    }

    // Bước 3: Khử trùng lặp Tầng 1 (Định danh SĐT + Địa chỉ)
    const detMatch = await this.checkDeterministicMatch(ext.ownerContact.phone, ext.address, ext.district);
    if (detMatch) {
      await this.aggregateSubListing(detMatch, input, ext, newImageHashes);
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
        await this.aggregateSubListing(visMatch.matchedApartment, input, ext, newImageHashes);
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

    const newApartment = await Apartment.create({
      title: ext.title,
      description: input.rawText,
      price: ext.price,
      deposit: ext.deposit,
      commission: { type: 'PERCENT', value: 50 },
      location: {
        address: ext.address,
        district: ext.district,
        city: ext.city || 'Hà Nội',
      },
      attributes: {
        area: ext.area,
        bedrooms: ext.bedrooms,
        bathrooms: ext.bathrooms,
        furnishing: ext.furnishing,
        elevator: ext.elevator,
        allowPets: ext.allowPets,
        carParking: ext.carParking,
        pcccStandard: ext.pcccStandard,
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
      status: ext.needsReview ? 'UPCOMING' : 'AVAILABLE',
      managerId: input.managerId,
    });

    LeadMatchingService.runInBackground(newApartment); // Story 6.3: báo CTV có khách phù hợp
    return {
      isRentalListing: true,
      isDuplicate: false,
      apartmentId: newApartment._id,
      apartment: newApartment,
      message: 'Tin căn hộ mới độc lập đã được thêm vào Bảng hàng.',
    };
  }

  /**
   * Helper gộp subListing và cập nhật căn Master
   */
  private static async aggregateSubListing(
    master: IApartment,
    input: IProcessListingInput,
    ext: any,
    newHashes: string[]
  ): Promise<void> {
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

    if (newHashes.length > 0) {
      const existing = new Set(master.imageHashes || []);
      newHashes.forEach((h) => existing.add(h));
      master.imageHashes = Array.from(existing);
    }

    master.updatedAt = new Date();
    await master.save();
  }
}

