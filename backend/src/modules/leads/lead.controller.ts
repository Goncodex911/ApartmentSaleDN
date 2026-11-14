import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler as handle } from '../../utils/async-handler.js';
import { LeadService } from './lead.service.js';
import { createLeadSchema, updateLeadSchema, changeStageSchema, addNoteSchema } from './lead.validation.js';

const leadId = (req: AuthRequest) => String(req.params.id);

export class LeadController {
  // GET /api/v1/leads — khách của tôi
  static list = handle(async (req, res) => {
    res.status(200).json({ success: true, data: await LeadService.list(req.user!.id) });
  });

  // GET /api/v1/leads/:id — chi tiết 1 khách (mở từ thông báo ghép căn)
  static getById = handle(async (req, res) => {
    res.status(200).json({ success: true, data: await LeadService.getById(leadId(req), req.user!.id) });
  });

  // POST /api/v1/leads — thêm khách thủ công
  static create = handle(async (req, res) => {
    const input = createLeadSchema.parse(req.body);
    res.status(201).json({ success: true, data: await LeadService.create(req.user!.id, input) });
  });

  // PATCH /api/v1/leads/:id — sửa tên, SĐT, nhu cầu
  static update = handle(async (req, res) => {
    const input = updateLeadSchema.parse(req.body);
    res.status(200).json({ success: true, data: await LeadService.update(leadId(req), req.user!.id, input) });
  });

  // PATCH /api/v1/leads/:id/stage — chuyển giai đoạn
  static changeStage = handle(async (req, res) => {
    const input = changeStageSchema.parse(req.body);
    res.status(200).json({ success: true, data: await LeadService.changeStage(leadId(req), req.user!.id, input) });
  });

  // POST /api/v1/leads/:id/notes — ghi chú nhanh
  static addNote = handle(async (req, res) => {
    const { content } = addNoteSchema.parse(req.body);
    res.status(201).json({ success: true, data: await LeadService.addNote(leadId(req), req.user!.id, content) });
  });

  // DELETE /api/v1/leads/:id
  static delete = handle(async (req, res) => {
    await LeadService.delete(leadId(req), req.user!.id);
    res.status(200).json({ success: true, message: 'Đã xóa khách hàng' });
  });
}
