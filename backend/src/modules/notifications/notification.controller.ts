import { asyncHandler } from '../../utils/async-handler.js';
import { NotificationService } from './notification.service.js';

export class NotificationController {
  // GET /api/v1/notifications — 30 thông báo gần nhất + số chưa đọc
  static list = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await NotificationService.listForUser(req.user!.id) });
  });

  // PATCH /api/v1/notifications/read-all
  static markAllRead = asyncHandler(async (req, res) => {
    await NotificationService.markAllRead(req.user!.id);
    res.status(200).json({ success: true });
  });

  // PATCH /api/v1/notifications/:id/read
  static markRead = asyncHandler(async (req, res) => {
    await NotificationService.markRead(String(req.params.id), req.user!.id);
    res.status(200).json({ success: true });
  });
}
