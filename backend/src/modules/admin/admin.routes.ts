import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';
import { AdminController } from './admin.controller.js';
import { AuditController } from '../audit/audit.controller.js';
import { SecurityAlertController } from '../security/security-alert.controller.js';
import { TrashController } from '../apartments/trash.controller.js';
import { HealthController } from '../health/health.controller.js';
import { AnnouncementController } from '../announcements/announcement.controller.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { AuthRequest } from '../../middlewares/auth.js';

// Khu quản trị /api/v1/admin — chỉ ADMIN (Epic 13)
const router = Router();
router.use(authMiddleware, requireRoles('ADMIN'));

router.get('/dashboard-stats', AdminController.dashboardStats); // Story 13.1
router.get('/audit-logs', AuditController.list); // Story 13.3
router.get('/audit-logs/export', AuditController.exportCsv); // Story 16.2
router.get('/broker-performance', AdminController.brokerPerformance); // Story 13.4
// Story 13.5 — cấu hình hệ thống
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);
router.post('/settings/telegram-sources', AdminController.addTelegramSource);
router.patch('/settings/telegram-sources/:chatId', AdminController.toggleTelegramSource);
router.delete('/settings/telegram-sources/:chatId', AdminController.removeTelegramSource);

// Story 16.5 — cảnh báo bảo mật
router.get('/alerts', SecurityAlertController.list);
router.get('/alerts/count', SecurityAlertController.count);
router.patch('/alerts/:id/resolve', SecurityAlertController.resolve);

// Story 16.7 — Thùng rác & Kho tồn
router.get('/trash', TrashController.listTrash);
router.post('/trash/:id/restore', TrashController.restore);
router.delete('/trash/:id', TrashController.purge);
router.get('/stale', TrashController.listStale);
router.post('/stale/bulk', TrashController.bulkStale);

// Story 16.8a — sức khỏe dịch vụ (kiểm tra tay tối đa 6 lần / phút / Admin: không thành công cụ dò)
const pingLimit = rateLimit({ windowMs: 60_000, max: 6, message: 'Bạn kiểm tra quá nhanh, vui lòng chờ 1 phút', key: (req) => `health:${(req as AuthRequest).user!.id}` });
router.get('/health/status', HealthController.status);
router.post('/health/ping', pingLimit, HealthController.ping);
router.get('/health/quotas', HealthController.quotas); // Story 16.8b

// Story 16.9 — thông báo chung
router.get('/announcements', AnnouncementController.list);
router.post('/announcements', AnnouncementController.send);
router.post('/announcements/:id/revoke', AnnouncementController.revoke);

export const adminRoutes = router;
