import { isValidObjectId } from 'mongoose';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { auditActor } from '../audit/audit.service.js';
import { ListingReportService } from './listing-report.service.js';
import { createReportSchema, resolveReportSchema } from './listing-report.validation.js';

const apartmentId = (req: AuthRequest) => {
  const id = String(req.params.apartmentId);
  if (!isValidObjectId(id)) throw { status: 404, message: 'Không tìm thấy căn hộ' };
  return id;
};

export class ListingReportController {
  // POST /api/v1/reports/:apartmentId — CTV / Quản lý báo lỗi tin (Story 13.6)
  static create = asyncHandler(async (req, res) => {
    await ListingReportService.report(apartmentId(req), req.user!, createReportSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Cảm ơn, Quản lý sẽ kiểm tra' });
  });

  // GET /api/v1/reports/:apartmentId — báo lỗi đang mở của 1 căn (Quản lý)
  static listForApartment = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await ListingReportService.listForApartment(apartmentId(req)) });
  });

  // GET /api/v1/reports — hàng đợi kiểm duyệt (Admin + Quản lý)
  static queue = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await ListingReportService.queue(req.user!) });
  });

  // POST /api/v1/reports/:apartmentId/resolve — Đã thuê / sửa giá / tin vẫn đúng
  static resolve = asyncHandler(async (req, res) => {
    const data = await ListingReportService.resolve(apartmentId(req), auditActor(req), resolveReportSchema.parse(req.body));
    res.status(200).json({ success: true, message: 'Đã xử lý báo lỗi', data });
  });
}
