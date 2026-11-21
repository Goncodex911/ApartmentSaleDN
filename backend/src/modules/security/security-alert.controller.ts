import { asyncHandler } from '../../utils/async-handler.js';
import { SecurityAlertService, listAlertsQuerySchema } from './security-alert.service.js';

export class SecurityAlertController {
  // [ADMIN] GET /api/v1/admin/alerts?status=open|resolved&page= (Story 16.5)
  static list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await SecurityAlertService.list(listAlertsQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });

  // [ADMIN] GET /api/v1/admin/alerts/count — số cảnh báo chưa xử lý (badge menu Quản trị)
  static count = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: { count: await SecurityAlertService.countOpen() } });
  });

  // [ADMIN] PATCH /api/v1/admin/alerts/:id/resolve
  static resolve = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Đã đánh dấu xử lý', data: await SecurityAlertService.resolve(String(req.params.id), req.user!.id) });
  });
}
