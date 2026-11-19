import { isValidObjectId } from 'mongoose';
import { SubmissionService } from './submission.service.js';
import { approveSubmissionSchema, listSubmissionsQuerySchema, rejectSubmissionSchema, submissionDataSchema } from './submission.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { auditActor } from '../audit/audit.service.js';

const submissionId = (req: AuthRequest) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw { status: 404, message: 'Không tìm thấy tin đăng' };
  return id;
};

// Tin CTV đăng chờ duyệt (Story 8.6): controller chỉ kiểm tra dữ liệu, nghiệp vụ nằm ở SubmissionService
export class SubmissionController {
  static create = asyncHandler(async (req, res) => {
    const data = await SubmissionService.create(req.user!.id, submissionDataSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Đã gửi tin, chờ Quản lý duyệt', data });
  });

  static listMine = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await SubmissionService.listMine(req.user!.id, listSubmissionsQuerySchema.parse(req.query))) });
  });

  static list = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await SubmissionService.list(listSubmissionsQuerySchema.parse(req.query))) });
  });

  static pendingCount = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: { count: await SubmissionService.pendingCount() } });
  });

  static getById = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await SubmissionService.getById(submissionId(req), req.user!) });
  });

  static update = asyncHandler(async (req, res) => {
    const data = await SubmissionService.update(submissionId(req), req.user!, submissionDataSchema.parse(req.body));
    res.status(200).json({ success: true, message: 'Đã cập nhật tin', data });
  });

  static withdraw = asyncHandler(async (req, res) => {
    const data = await SubmissionService.withdraw(submissionId(req), req.user!.id);
    res.status(200).json({ success: true, message: 'Đã rút tin', data });
  });

  static duplicates = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await SubmissionService.findDuplicates(submissionId(req)) });
  });

  static approve = asyncHandler(async (req, res) => {
    const { mergeInto } = approveSubmissionSchema.parse(req.body ?? {});
    const data = await SubmissionService.approve(submissionId(req), auditActor(req), mergeInto);
    res.status(200).json({ success: true, message: mergeInto ? 'Đã duyệt và gộp vào căn có sẵn' : 'Đã duyệt, căn đã vào kho', data });
  });

  static reject = asyncHandler(async (req, res) => {
    const data = await SubmissionService.reject(submissionId(req), auditActor(req), rejectSubmissionSchema.parse(req.body).reason);
    res.status(200).json({ success: true, message: 'Đã từ chối tin', data });
  });
}
