import { isValidObjectId } from 'mongoose';
import { Lead, LeadStage, pushLeadNote } from './lead.model.js';
import { CreateLeadInput, UpdateLeadInput, ChangeStageInput } from './lead.validation.js';
import { Apartment } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import { MATCH_THRESHOLD, scoreLeadMatch } from './lead-matching.service.js';
import { User } from '../auth/user.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { maskPhonesInText } from '../../utils/phone-text.js';

const MAX_MATCHES = 10;
const MATCH_CANDIDATES = 300;

export const STAGE_LABEL: Record<LeadStage, string> = {
  NEW: 'MỚI LIÊN HỆ',
  CONSULTING: 'ĐANG TƯ VẤN',
  VIEWING: 'HẸN XEM PHÒNG',
  DEPOSITED: 'ĐÃ ĐẶT CỌC',
  LOST: 'HỦY / KHÔNG HỢP',
};

const formatVnDateTime = (date: Date) =>
  date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

// Mỗi CTV chỉ thao tác được khách của mình → khách của người khác coi như không tồn tại (404)
async function findOwnLead(leadId: string, ctvId: string) {
  const lead = isValidObjectId(leadId) ? await Lead.findOne({ _id: leadId, ctvId }) : null;
  if (!lead) throw { status: 404, message: 'Không tìm thấy khách hàng' };
  return lead;
}

export class LeadService {
  static async list(ctvId: string) {
    return Lead.find({ ctvId }).sort({ lastActivityAt: -1 }).limit(500).lean();
  }

  static async getById(leadId: string, ctvId: string) {
    return findOwnLead(leadId, ctvId);
  }

  static async create(ctvId: string, input: CreateLeadInput) {
    const lead = new Lead({
      ctvId,
      name: input.name,
      phone: input.phone || undefined,
      source: 'MANUAL',
      requirements: { districts: [], ...input.requirements },
    });
    if (input.note) pushLeadNote(lead, input.note);
    return lead.save();
  }

  static async update(leadId: string, ctvId: string, input: UpdateLeadInput) {
    const lead = await findOwnLead(leadId, ctvId);
    if (input.name !== undefined) lead.name = input.name;
    if (input.phone !== undefined) lead.phone = input.phone || undefined;
    // Gán từng tiêu chí nhu cầu → sửa ngân sách không làm mất khu vực đã lưu
    for (const [key, value] of Object.entries(input.requirements || {})) lead.set(`requirements.${key}`, value);
    lead.lastActivityAt = new Date();
    return lead.save();
  }

  static async changeStage(leadId: string, ctvId: string, input: ChangeStageInput) {
    const lead = await findOwnLead(leadId, ctvId);
    lead.stage = input.stage;

    // Ghi chú hệ thống mô tả lần chuyển giai đoạn (VD: "→ HẸN XEM PHÒNG 18:00 20/11")
    let systemNote = `→ ${STAGE_LABEL[input.stage]}`;
    if (input.stage === 'VIEWING' && input.viewingAt) {
      lead.viewingAt = new Date(input.viewingAt);
      systemNote += ` ${formatVnDateTime(lead.viewingAt)}`;
    }
    if (input.stage === 'LOST' && input.lostReason) {
      lead.lostReason = input.lostReason;
      systemNote += `: ${input.lostReason}`;
    }
    // Story 14.8: khách cọc căn MỚI (khác căn đã báo) → báo cả đội Quản lý xác nhận; trạng thái căn KHÔNG tự đổi
    const depositId = input.stage === 'DEPOSITED' ? input.depositedApartmentId : undefined;
    let depositedTitle: string | undefined;
    if (depositId && String(lead.depositedApartmentId) !== depositId) {
      const apartment = await Apartment.findById(depositId).select('title').lean();
      if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
      depositedTitle = maskPhonesInText(apartment.title); // Tiêu đề tin gốc có thể chứa SĐT chủ
      lead.set('depositedApartmentId', depositId);
      systemNote += `: ${depositedTitle}`;
    }

    pushLeadNote(lead, systemNote, true);
    const saved = await lead.save();
    if (depositedTitle) {
      const ctv = await User.findById(ctvId).select('name').lean();
      NotificationService.notifyManagers({
        type: 'LEAD_DEPOSITED',
        title: 'CTV báo khách đã cọc căn',
        body: `CTV ${ctv?.name || ''} báo khách ${saved.name} đã cọc: ${depositedTitle}. Bấm để mở căn và cập nhật trạng thái.`,
        apartmentId: depositId,
      }).catch(() => undefined); // Lỗi gửi thông báo không làm hỏng việc chuyển giai đoạn
    }
    return saved;
  }

  /** Căn đang trống / sắp trống phù hợp ≥ 80% với khách, sắp theo điểm (Story 11.1). */
  static async matches(leadId: string, ctvId: string, role: string) {
    const { requirements } = await findOwnLead(leadId, ctvId);
    const filter: Record<string, unknown> = { status: { $in: ['AVAILABLE', 'UPCOMING'] } };
    // Khách chỉ khai khu vực mới → sai khu vực tối đa còn 65% → lọc luôn ở DB cho nhanh
    if (requirements.zones?.length && !requirements.districts?.length) filter['location.zone'] = { $in: requirements.zones };
    const candidates = await Apartment.find(filter).select('-imageHashes').sort({ updatedAt: -1 }).limit(MATCH_CANDIDATES).lean();
    return candidates
      .map((apartment) => ({ apartment, match: scoreLeadMatch(requirements, apartment) }))
      .filter((item): item is typeof item & { match: NonNullable<typeof item.match> } => !!item.match && item.match.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, MAX_MATCHES)
      .map(({ apartment, match }) => ({ ...match, apartment: ApartmentService.maskApartment(apartment, role) }));
  }

  /** Điểm phù hợp giữa khách và 1 căn — mở từ thông báo ghép căn. */
  static async matchScore(leadId: string, ctvId: string, apartmentId: string) {
    const { requirements } = await findOwnLead(leadId, ctvId);
    const apartment = isValidObjectId(apartmentId) ? await Apartment.findById(apartmentId).lean() : null;
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    return scoreLeadMatch(requirements, apartment) || { score: 0, reasons: [] };
  }

  static async addNote(leadId: string, ctvId: string, content: string) {
    const lead = await findOwnLead(leadId, ctvId);
    pushLeadNote(lead, content);
    return lead.save();
  }

  static async delete(leadId: string, ctvId: string) {
    const lead = await findOwnLead(leadId, ctvId);
    await lead.deleteOne();
  }
}
