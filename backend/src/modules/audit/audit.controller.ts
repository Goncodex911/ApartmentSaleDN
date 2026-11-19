import { asyncHandler } from '../../utils/async-handler.js';
import { AuditService, listAuditLogsQuerySchema } from './audit.service.js';

export class AuditController {
  // [ADMIN] GET /api/v1/admin/audit-logs?action=&userId=&search=&page= — nhật ký truy vết (Story 13.3)
  static list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await AuditService.list(listAuditLogsQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });
}
