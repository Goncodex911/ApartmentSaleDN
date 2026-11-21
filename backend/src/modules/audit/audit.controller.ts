import { asyncHandler } from '../../utils/async-handler.js';
import { AuditService, auditActor, listAuditLogsQuerySchema } from './audit.service.js';

export class AuditController {
  // [ADMIN] GET /api/v1/admin/audit-logs?action=&category=&severity=&userId=&from=&to=&search=&page= — nhật ký hoạt động (Story 13.3, 16.2)
  static list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await AuditService.list(listAuditLogsQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });

  // [ADMIN] GET /api/v1/admin/audit-logs/export — CSV theo bộ lọc hiện tại (Story 16.2)
  static exportCsv = asyncHandler(async (req, res) => {
    const csv = await AuditService.exportCsv(listAuditLogsQuerySchema.parse(req.query), auditActor(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csv);
  });
}
