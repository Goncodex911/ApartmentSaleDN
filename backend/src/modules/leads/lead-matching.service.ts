import { Lead, ILeadRequirements, OPEN_LEAD_STAGES } from './lead.model.js';
import { IApartment } from '../apartments/apartment.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { normalizeDistrict } from '../../utils/vietnamese.js';
import { maskPhonesInText } from '../../utils/phone-text.js';

// Cho phép giá căn vượt ngân sách khách tối đa 5% (khách thường linh hoạt một chút)
const BUDGET_TOLERANCE = 1.05;

type MatchableApartment = Pick<IApartment, 'title' | 'price' | 'status' | 'location' | 'attributes'> & { _id: unknown };

const formatMillions = (price: number) => `${Number((price / 1_000_000).toFixed(1))}tr`;

/**
 * So khớp nhu cầu khách với 1 căn (Story 6.3 - AC1).
 * Tiêu chí khách chưa khai thì bỏ qua; khách phải có ít nhất khu vực hoặc ngân sách mới được ghép.
 */
export function isLeadMatch(requirements: ILeadRequirements, apartment: MatchableApartment): boolean {
  const districts = requirements.districts || [];
  if (districts.length === 0 && !requirements.maxBudget) return false;

  if (districts.length > 0) {
    const apartmentDistrict = normalizeDistrict(apartment.location.district);
    const districtMatched = districts.some((wanted) => {
      const normalized = normalizeDistrict(wanted);
      return !!normalized && !!apartmentDistrict && (apartmentDistrict.includes(normalized) || normalized.includes(apartmentDistrict));
    });
    if (!districtMatched) return false;
  }

  if (requirements.maxBudget && apartment.price > requirements.maxBudget * BUDGET_TOLERANCE) return false;
  if (requirements.allowPets && !apartment.attributes.allowPets) return false;
  if (requirements.carParking && !apartment.attributes.carParking) return false;
  if (requirements.bedrooms != null && apartment.attributes.bedrooms !== requirements.bedrooms) return false;
  return true;
}

export class LeadMatchingService {
  /** Tìm khách đang mở phù hợp với căn mới và gửi thông báo ghép căn. Trả về số thông báo đã gửi. */
  static async matchNewApartment(apartment: MatchableApartment): Promise<number> {
    if (apartment.status !== 'AVAILABLE' && apartment.status !== 'UPCOMING') return 0;

    // Lọc thô ở DB (giai đoạn + ngân sách), lọc chi tiết (quận bỏ dấu, pet, ô tô...) trong isLeadMatch
    const candidates = await Lead.find({
      stage: { $in: OPEN_LEAD_STAGES },
      $or: [{ 'requirements.maxBudget': { $exists: false } }, { 'requirements.maxBudget': { $gte: apartment.price / BUDGET_TOLERANCE } }],
    })
      .select('ctvId name requirements')
      .lean();

    // Tiêu đề căn nhập từ tin gốc có thể chứa SĐT chủ nhà → che trước khi gửi cho CTV
    const title = maskPhonesInText(apartment.title);
    let notifiedCount = 0;
    for (const lead of candidates.filter((item) => isLeadMatch(item.requirements, apartment))) {
      const sent = await NotificationService.notify({
        userId: String(lead.ctvId),
        type: 'APARTMENT_MATCH',
        title: 'Có căn mới phù hợp khách của bạn',
        body: `Có căn mới ${title} - ${apartment.location.district} ${formatMillions(apartment.price)} rất hợp với khách [${lead.name}] của bạn. Bấm để gửi ngay!`,
        leadId: String(lead._id),
        apartmentId: String(apartment._id),
      });
      if (sent) notifiedCount++;
    }
    return notifiedCount;
  }

  /** Chạy nền sau khi tạo căn: không làm chậm/hỏng luồng tạo căn, lỗi chỉ ghi log. */
  static runInBackground(apartment: MatchableApartment): void {
    this.matchNewApartment(apartment).catch((err) => console.error('[Lead Matching] Lỗi ghép căn:', err.message));
  }
}
