import { isValidObjectId } from 'mongoose';
import { Lead, LeadStage, pushLeadNote } from './lead.model.js';
import { CreateLeadInput, UpdateLeadInput, ChangeStageInput } from './lead.validation.js';

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
    if (input.stage === 'DEPOSITED' && input.depositedApartmentId) {
      lead.set('depositedApartmentId', input.depositedApartmentId);
    }

    pushLeadNote(lead, systemNote, true);
    return lead.save();
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
