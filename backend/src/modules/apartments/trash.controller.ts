import { asyncHandler } from '../../utils/async-handler.js';
import { auditActor } from '../audit/audit.service.js';
import { TrashService, bulkStaleSchema, pageQuerySchema, staleQuerySchema } from './trash.service.js';

// [ADMIN] Story 16.7 — /api/v1/admin/trash, /api/v1/admin/stale
export class TrashController {
  static listTrash = asyncHandler(async (req, res) => {
    const { items, ...meta } = await TrashService.listTrash(pageQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });

  static restore = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Đã khôi phục căn', data: await TrashService.restore(auditActor(req), String(req.params.id)) });
  });

  static purge = asyncHandler(async (req, res) => {
    await TrashService.purge(auditActor(req), String(req.params.id));
    res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn' });
  });

  static listStale = asyncHandler(async (req, res) => {
    const { items, ...meta } = await TrashService.listStale(staleQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });

  static bulkStale = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await TrashService.bulkStale(auditActor(req), bulkStaleSchema.parse(req.body)) });
  });
}
