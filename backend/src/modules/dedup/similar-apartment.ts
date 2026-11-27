import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { districtOfZone, Zone } from '../apartments/listing-taxonomy.js';
import { User } from '../auth/user.model.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { splitAddress } from '../../utils/street.js';
import { toVnPhone } from '../../utils/validators.js';
import { DedupService } from './dedup.service.js';
import { normalizeText, sameStreet, streetKey } from './street-key.js';

/** Dữ liệu căn sắp lưu — cùng cấu trúc form căn hộ / tin CTV (Story 13.10). */
export interface ListingLike {
  title?: string;
  price: number;
  location: { street?: string; houseNumber?: string; buildingName?: string; address?: string; zone?: Zone; district?: string };
  attributes?: { propertyType?: string; bedrooms?: number; area?: number };
  ownerContact?: { phone?: string };
}

type TripletInput = {
  street: string;
  district?: string;
  price: number;
  propertyType?: string;
  bedrooms?: number;
  title?: string;
  houseNumber?: string;
  buildingName?: string;
  phone?: string;
};
type TripletCandidate = Pick<IApartment, 'title' | 'price' | 'location' | 'attributes' | 'ownerContact'>;

const PROPERTY_LABELS: Record<string, string> = {
  APARTMENT: 'Căn hộ', STUDIO: 'Studio', DUPLEX: 'Duplex', PENTHOUSE: 'Penthouse', HOUSE: 'Nhà nguyên căn', VILLA: 'Villa',
};
// Chỉ lấy ảnh đầu (thẻ tóm tắt), không tải cả album của 300 căn
const CANDIDATE_FIELDS = { title: 1, price: 1, location: 1, attributes: 1, 'ownerContact.phone': 1, managerId: 1, images: { $slice: 1 }, createdAt: 1 };

const titleWords = (text = '') => new Set(normalizeText(text).split(' ').filter((w) => w.length > 1));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((w) => b.has(w)).length;
  return a.size + b.size - shared === 0 ? 0 : shared / (a.size + b.size - shared);
};
// Số nhà so theo chữ số + chữ cái, bỏ tiền tố "Số", "Kiệt", "K"…: "K12/3" = "Kiệt 12/3"
const houseKey = (text?: string) =>
  normalizeText(text).replace(/^(?:so|nha|kiet|hem|ngo|ngach|lo|k|h)\s*/, '').replace(/\s/g, '');
// Cả 2 bên đều có giá trị mà khác nhau → chắc chắn là 2 căn khác nhau
const bothDiffer = (a?: string, b?: string) => Boolean(a && b && a !== b);

/**
 * CE-03.2 — luật bộ 3 (sau khi đã cùng quận + giá lệch ≤ 5%): cùng tên đường, KHÔNG khác số nhà / tòa nhà / SĐT chủ,
 * và cùng loại căn VÀ cùng số phòng ngủ. Thiếu loại căn hoặc số phòng ở 1 bên → cần tiêu đề giống ≥ 60%.
 * Trùng → trả lý do đầy đủ để người dùng biết vì sao bị cảnh báo; không trùng → null.
 */
export function isTripletDuplicate(input: TripletInput, apt: TripletCandidate): string | null {
  const street = apt.location.street || apt.location.address;
  if (!sameStreet(input.street, street)) return null;
  const aptHouse = apt.location.houseNumber || splitAddress(apt.location.address).houseNumber;
  if (bothDiffer(houseKey(input.houseNumber), houseKey(aptHouse))) return null;
  if (bothDiffer(normalizeText(input.buildingName), normalizeText(apt.location.buildingName))) return null;
  if (bothDiffer(toVnPhone(input.phone), toVnPhone(apt.ownerContact?.phone))) return null;

  const { propertyType, bedrooms } = apt.attributes || {};
  const hasType = input.propertyType !== undefined && propertyType !== undefined && input.bedrooms !== undefined && bedrooms !== undefined;
  if (hasType ? input.propertyType !== propertyType || input.bedrooms !== bedrooms : jaccard(titleWords(input.title), titleWords(apt.title)) < 0.6) return null;
  const priceGap = Math.round((Math.abs(apt.price - input.price) / input.price) * 100);
  const kind = hasType ? `cùng loại ${PROPERTY_LABELS[propertyType!] || propertyType} ${bedrooms} PN` : 'tiêu đề gần giống';
  return `Cùng đường ${splitAddress(street).street || street}, giá lệch ${priceGap}%, ${kind}`;
}

/** Bộ 3 (dùng khi tin không có SĐT chủ hoặc SĐT khác): cùng quận + giá lệch ≤ 5% + luật isTripletDuplicate. */
export async function checkTripletMatch(input: TripletInput, excludeId?: string): Promise<{ apartment: IApartment; reason: string } | null> {
  if (!streetKey(input.street) || !(input.price > 0)) return null;

  const query: any = {
    price: { $gte: input.price * 0.95, $lte: input.price * 1.05 },
  };
  if (input.district) {
    query['location.district'] = new RegExp(`^${escapeRegex(input.district.trim())}$`, 'i');
  }
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // Căn cập nhật gần đây trước, chỉ lấy trường cần so
  const candidates = await Apartment.find(query).sort({ updatedAt: -1 }).limit(300).select(CANDIDATE_FIELDS).lean<IApartment[]>();
  for (const apartment of candidates) {
    const reason = isTripletDuplicate(input, apartment);
    if (reason) return { apartment, reason };
  }
  return null;
}

/**
 * Tìm 1 căn trong kho có thể trùng: SĐT chủ + tên đường → bộ 3 → ảnh (nếu truyền hàm tính pHash).
 * Chỉ dùng cho luồng có người xác nhận (Quản lý tạo căn, CTV đăng tin, duyệt tin) — không tự gộp.
 */
export async function findSimilarApartment(data: ListingLike, imageHashes?: () => Promise<string[]>, excludeId?: string) {
  const { location, attributes } = data;
  const district = (location.zone && districtOfZone(location.zone)) || location.district || '';
  const street = location.street || location.address || '';

  // Story 20.1: căn khác chữ ký (khác PN / loại / diện tích / tòa) của cùng chủ, cùng đường không bị báo trùng
  const unit = { propertyType: attributes?.propertyType, bedrooms: attributes?.bedrooms, area: attributes?.area, buildingName: location.buildingName };
  const { match, uncertain } = await DedupService.checkDeterministicMatch(data.ownerContact?.phone || '', street, district, unit, excludeId);
  const byPhone = match || uncertain; // Luồng có người xác nhận → "chưa chắc" vẫn cảnh báo
  if (byPhone) return { apartment: byPhone, reason: 'Trùng SĐT chủ nhà và tên đường' };

  const byTriplet = await checkTripletMatch(
    {
      street,
      district,
      price: data.price,
      propertyType: attributes?.propertyType,
      bedrooms: attributes?.bedrooms,
      title: data.title,
      houseNumber: location.houseNumber || splitAddress(location.address).houseNumber,
      buildingName: location.buildingName,
      phone: data.ownerContact?.phone,
    },
    excludeId
  );
  if (byTriplet) return byTriplet;

  const byPhoto = imageHashes && (await DedupService.checkVisualMatch(await imageHashes(), district, unit));
  return byPhoto ? { apartment: byPhoto.matchedApartment, reason: 'Trùng ảnh' } : null;
}

/** Thẻ tóm tắt căn nghi trùng. CTV chỉ thấy tiêu đề · giá · khu vực (không lộ địa chỉ nội bộ, người tạo). */
export async function summarizeDuplicate(match: { apartment: IApartment; reason: string }, privileged: boolean) {
  const { apartment, reason } = match;
  // CE-03.3: CTV thấy tên đường (không số nhà) để hiểu vì sao bị cảnh báo
  const base = { _id: apartment._id, title: apartment.title, price: apartment.price, area: apartment.location.zone || apartment.location.district, street: apartment.location.street || splitAddress(apartment.location.address).street, reason };
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
