import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { districtOfZone, Zone } from '../apartments/listing-taxonomy.js';
import { User } from '../auth/user.model.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { DedupService } from './dedup.service.js';

/** Dữ liệu căn sắp lưu — cùng cấu trúc form căn hộ / tin CTV (Story 13.10). */
export interface ListingLike {
  title?: string;
  price: number;
  location: { street?: string; houseNumber?: string; address?: string; zone?: Zone; district?: string };
  attributes?: { propertyType?: string; bedrooms?: number };
  ownerContact?: { phone?: string };
}

type TripletInput = { street: string; district?: string; price: number; propertyType?: string; bedrooms?: number; title?: string };

// Từ không mang tên đường: tiền tố đường/ngõ/kiệt và số nhà (VD "K12/5 Lê Quang Đạo" → "le quang dao")
const STREET_STOPWORDS = new Set(['duong', 'pho', 'ngo', 'ngach', 'kiet', 'hem', 'so', 'nha', 'k', 'h']);
const streetKey = (text = '') =>
  DedupService.normalizeText(text).split(' ').filter((w) => w && !/\d/.test(w) && !STREET_STOPWORDS.has(w)).join(' ');

const titleWords = (text = '') => new Set(DedupService.normalizeText(text).split(' ').filter((w) => w.length > 1));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((w) => b.has(w)).length;
  return a.size + b.size - shared === 0 ? 0 : shared / (a.size + b.size - shared);
};

/**
 * Bộ 3 (dùng khi tin không có SĐT chủ hoặc SĐT khác): cùng quận + giá lệch ≤ 5% + cùng tên đường
 * + cùng loại căn (trùng loại căn HOẶC số phòng ngủ HOẶC tiêu đề giống ≥ 50%).
 */
export async function checkTripletMatch(input: TripletInput, excludeId?: string): Promise<IApartment | null> {
  const key = streetKey(input.street);
  if (!key || !(input.price > 0)) return null;

  const query: any = {
    price: { $gte: input.price * 0.95, $lte: input.price * 1.05 },
  };
  if (input.district) {
    query['location.district'] = new RegExp(`^${escapeRegex(input.district.trim())}$`, 'i');
  }
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const candidates = await Apartment.find(query).limit(200);

  const words = titleWords(input.title);
  return (
    candidates.find((apt) => {
      const aptKey = streetKey(apt.location.street || apt.location.address);
      if (!aptKey || !(aptKey.includes(key) || key.includes(aptKey))) return false;
      const { propertyType, bedrooms } = apt.attributes;
      return (
        (input.propertyType !== undefined && input.propertyType === propertyType) ||
        (input.bedrooms !== undefined && input.bedrooms === bedrooms) ||
        jaccard(words, titleWords(apt.title)) >= 0.5
      );
    }) || null
  );
}

/**
 * Tìm 1 căn trong kho có thể trùng: SĐT chủ + tên đường → bộ 3 → ảnh (nếu truyền hàm tính pHash).
 * Chỉ dùng cho luồng có người xác nhận (Quản lý tạo căn, CTV đăng tin, duyệt tin) — không tự gộp.
 */
export async function findSimilarApartment(data: ListingLike, imageHashes?: () => Promise<string[]>, excludeId?: string) {
  const { location, attributes } = data;
  const district = (location.zone && districtOfZone(location.zone)) || location.district || '';
  const street = location.street || location.address || '';
  const address = [location.houseNumber, location.street].filter(Boolean).join(' ') || location.address || '';

  const byPhone = await DedupService.checkDeterministicMatch(data.ownerContact?.phone || '', address, district, excludeId);
  if (byPhone) return { apartment: byPhone, reason: 'Trùng SĐT chủ nhà và tên đường' };

  const byTriplet = await checkTripletMatch(
    { street, district, price: data.price, propertyType: attributes?.propertyType, bedrooms: attributes?.bedrooms, title: data.title },
    excludeId
  );
  if (byTriplet) return { apartment: byTriplet, reason: 'Trùng Tên đường, Giá thuê và Loại căn' };

  const byPhoto = imageHashes && (await DedupService.checkVisualMatch(await imageHashes(), district));
  return byPhoto ? { apartment: byPhoto.matchedApartment, reason: 'Trùng ảnh' } : null;
}

/** Thẻ tóm tắt căn nghi trùng. CTV chỉ thấy tiêu đề · giá · khu vực (không lộ địa chỉ nội bộ, người tạo). */
export async function summarizeDuplicate(match: { apartment: IApartment; reason: string }, privileged: boolean) {
  const { apartment, reason } = match;
  const base = { _id: apartment._id, title: apartment.title, price: apartment.price, area: apartment.location.zone || apartment.location.district, reason };
  if (!privileged) return base;
  const creator = await User.findById(apartment.managerId).select('name').lean();
  return {
    ...base,
    address: apartment.location.address || [apartment.location.houseNumber, apartment.location.street].filter(Boolean).join(' '),
    image: apartment.images?.[0],
    createdAt: apartment.createdAt,
    createdBy: creator?.name || 'Quản lý',
  };
}
