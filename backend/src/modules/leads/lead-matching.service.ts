import { Lead, ILeadRequirements, LeadAmenity, OPEN_LEAD_STAGES } from './lead.model.js';
import { IApartment } from '../apartments/apartment.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { normalizeDistrict } from '../../utils/vietnamese.js';
import { maskPhonesInText } from '../../utils/phone-text.js';
import { usdToVndRate } from '../../config/currency.js';

// Cho phép giá căn vượt ngân sách khách tối đa 5% (khách thường linh hoạt một chút) — vượt trong mức này được nửa điểm giá
const BUDGET_TOLERANCE = 1.05;
// Trọng số chấm điểm (Story 11.1) — tổng 100; chỉ tính các tiêu chí khách có khai
export const MATCH_WEIGHTS = { area: 35, price: 35, type: 20, amenities: 10 } as const;
export const MATCH_THRESHOLD = 80;

export type MatchableApartment = Pick<IApartment, 'title' | 'price' | 'priceUsd' | 'status' | 'location' | 'attributes'> & { _id: unknown };
export interface MatchResult {
  score: number; // 0–100
  reasons: string[]; // Lý do khớp hiển thị cho CTV: "Đúng khu vực · Trong ngân sách · Có hồ bơi"
}

const AMENITY_LABEL: Record<LeadAmenity | 'carParking', string> = {
  pool: 'Có hồ bơi',
  allowPets: 'Cho nuôi thú cưng',
  privateWasher: 'Máy giặt riêng',
  elevator: 'Có thang máy',
  carParking: 'Có chỗ đậu ô tô',
};
const hasAmenity = ({ attributes }: MatchableApartment, key: LeadAmenity | 'carParking') =>
  key === 'privateWasher' ? attributes.washingMachine === 'PRIVATE' : attributes[key] === true;

/** Tiện ích bắt buộc của khách: danh sách mới + 2 cờ cũ (allowPets, carParking) của khách tạo trước Story 11.1. */
const requiredAmenities = (req: ILeadRequirements) =>
  [...new Set([...(req.amenities || []), ...(req.allowPets ? ['allowPets' as const] : []), ...(req.carParking ? ['carParking' as const] : [])])];

function districtMatches(districts: string[], apartmentDistrict: string) {
  const target = normalizeDistrict(apartmentDistrict);
  return districts.some((wanted) => {
    const normalized = normalizeDistrict(wanted);
    return !!normalized && !!target && (target.includes(normalized) || normalized.includes(target));
  });
}

/** Tỷ lệ giá căn / ngân sách: khách khai USD mà căn có giá USD thì so thẳng bằng USD, còn lại quy ra VNĐ. */
function priceRatio(req: ILeadRequirements, apartment: MatchableApartment) {
  if (req.budgetCurrency === 'USD' && apartment.priceUsd) return apartment.priceUsd / req.maxBudget!;
  const budgetVnd = req.budgetCurrency === 'USD' ? req.maxBudget! * usdToVndRate() : req.maxBudget!;
  return apartment.price / budgetVnd;
}

/**
 * Chấm điểm mức phù hợp giữa nhu cầu khách và 1 căn (Story 11.1).
 * Điểm = tổng trọng số đạt / tổng trọng số các tiêu chí khách có khai. Trả null khi không được ghép:
 * khách chưa khai khu vực lẫn ngân sách, hoặc khách cần nuôi thú cưng mà căn không cho (điều kiện bắt buộc thật).
 */
export function scoreLeadMatch(req: ILeadRequirements, apartment: MatchableApartment): MatchResult | null {
  const zones = req.zones || [];
  const districts = req.districts || [];
  const hasArea = zones.length > 0 || districts.length > 0;
  if (!hasArea && !req.maxBudget) return null;
  const amenities = requiredAmenities(req);
  if (amenities.includes('allowPets') && !apartment.attributes.allowPets) return null;

  let earned = 0;
  let possible = 0;
  const reasons: string[] = [];

  if (hasArea) {
    possible += MATCH_WEIGHTS.area;
    const zoneOk = !!apartment.location.zone && zones.includes(apartment.location.zone);
    if (zoneOk || (districts.length > 0 && districtMatches(districts, apartment.location.district))) {
      earned += MATCH_WEIGHTS.area;
      reasons.push('Đúng khu vực');
    }
  }
  if (req.maxBudget) {
    possible += MATCH_WEIGHTS.price;
    const ratio = priceRatio(req, apartment);
    if (ratio <= 1) {
      earned += MATCH_WEIGHTS.price;
      reasons.push('Trong ngân sách');
    } else if (ratio <= BUDGET_TOLERANCE) {
      earned += MATCH_WEIGHTS.price / 2;
      reasons.push('Vượt ngân sách dưới 5%');
    }
  }
  const types = req.propertyTypes || [];
  if (types.length > 0 || req.bedrooms != null) {
    possible += MATCH_WEIGHTS.type;
    if (apartment.attributes.propertyType && types.includes(apartment.attributes.propertyType)) {
      earned += MATCH_WEIGHTS.type;
      reasons.push('Đúng loại căn');
    } else if (req.bedrooms != null && apartment.attributes.bedrooms === req.bedrooms) {
      earned += MATCH_WEIGHTS.type;
      reasons.push('Đúng số phòng ngủ');
    }
  }
  if (amenities.length > 0) {
    possible += MATCH_WEIGHTS.amenities;
    const owned = amenities.filter((key) => hasAmenity(apartment, key));
    earned += (MATCH_WEIGHTS.amenities * owned.length) / amenities.length;
    reasons.push(...owned.map((key) => AMENITY_LABEL[key]));
  }
  return { score: Math.round((earned / possible) * 1000) / 10, reasons };
}

const formatMillions = (price: number) => `${Number((price / 1_000_000).toFixed(1))}tr`;

/** "Chị Lan – 2PN An Hải": tên khách kèm nhu cầu ngắn để CTV nhận ra ngay khách nào. */
function leadTag(name: string, req: ILeadRequirements) {
  const rooms = req.bedrooms != null ? (req.bedrooms === 0 ? 'Studio' : `${req.bedrooms}PN`) : '';
  const need = [rooms, req.zones?.[0] || req.districts?.[0]].filter(Boolean).join(' ');
  return need ? `${name} – ${need}` : name;
}

export class LeadMatchingService {
  /** Tìm khách đang mở phù hợp ≥ 80% với căn vừa vào kho / vừa trống lại và gửi thông báo. Trả về số thông báo đã gửi. */
  static async matchNewApartment(apartment: MatchableApartment): Promise<number> {
    if (apartment.status !== 'AVAILABLE' && apartment.status !== 'UPCOMING') return 0;

    // Lọc thô ở DB (giai đoạn + ngân sách VNĐ); ngân sách USD và chấm điểm chi tiết làm trong scoreLeadMatch
    const candidates = await Lead.find({
      stage: { $in: OPEN_LEAD_STAGES },
      $or: [
        { 'requirements.maxBudget': { $exists: false } },
        { 'requirements.budgetCurrency': 'USD' },
        { 'requirements.maxBudget': { $gte: apartment.price / BUDGET_TOLERANCE } },
      ],
    })
      .select('ctvId name requirements')
      .lean();

    // Tiêu đề căn nhập từ tin gốc có thể chứa SĐT chủ nhà → che trước khi gửi cho CTV
    const title = maskPhonesInText(apartment.title);
    let notifiedCount = 0;
    for (const lead of candidates) {
      const match = scoreLeadMatch(lead.requirements, apartment);
      if (!match || match.score < MATCH_THRESHOLD) continue;
      const sent = await NotificationService.notify({
        userId: String(lead.ctvId),
        type: 'APARTMENT_MATCH',
        title: `Căn mới phù hợp ${Math.round(match.score)}% với khách của bạn`,
        body: `Có căn mới phù hợp ${Math.round(match.score)}% với khách [${leadTag(lead.name, lead.requirements)}] của bạn: ${title} - ${formatMillions(apartment.price)}. Bấm để gửi ngay!`,
        leadId: String(lead._id),
        apartmentId: String(apartment._id),
      });
      if (sent) notifiedCount++;
    }
    return notifiedCount;
  }

  /** Chạy nền sau khi tạo căn / căn trống lại: không làm chậm/hỏng luồng chính, lỗi chỉ ghi log. */
  static runInBackground(apartment: MatchableApartment): void {
    this.matchNewApartment(apartment).catch((err) => console.error('[Lead Matching] Lỗi ghép căn:', err.message));
  }
}
