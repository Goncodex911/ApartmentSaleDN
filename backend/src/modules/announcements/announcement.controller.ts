import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { auditActor } from '../audit/audit.service.js';
import { AnnouncementService, sendAnnouncementSchema } from './announcement.service.js';

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

// Story 16.9 — thông báo chung
export class AnnouncementController {
  // [ADMIN] POST /api/v1/admin/announcements
  static send = asyncHandler(async (req, res) => {
    const data = await AnnouncementService.send(auditActor(req), sendAnnouncementSchema.parse(req.body));
    res.status(201).json({ success: true, message: `Đã gửi tới ${data.recipientCount} người`, data });
  });

  // [ADMIN] GET /api/v1/admin/announcements?page=
  static list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await AnnouncementService.list(pageSchema.parse(req.query).page);
    res.status(200).json({ success: true, data: items, meta });
  });

  // [ADMIN] POST /api/v1/admin/announcements/:id/revoke
  static revoke = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Đã thu hồi', data: await AnnouncementService.revoke(auditActor(req), String(req.params.id)) });
  });

  // GET /api/v1/announcements/active — dải ghim trên Bảng hàng
  static active = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await AnnouncementService.active(req.user!) });
  });

  // POST /api/v1/announcements/:id/dismiss
  static dismiss = asyncHandler(async (req, res) => {
    await AnnouncementService.dismiss(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true });
  });
}
