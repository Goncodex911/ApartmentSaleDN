import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';
import { AdminController } from './admin.controller.js';
import { AuditController } from '../audit/audit.controller.js';

// Khu quản trị /api/v1/admin — chỉ ADMIN (Epic 13)
const router = Router();
router.use(authMiddleware, requireRoles('ADMIN'));

router.get('/dashboard-stats', AdminController.dashboardStats); // Story 13.1
router.get('/audit-logs', AuditController.list); // Story 13.3
router.get('/broker-performance', AdminController.brokerPerformance); // Story 13.4
// Story 13.5 — cấu hình hệ thống
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);
router.post('/settings/telegram-sources', AdminController.addTelegramSource);
router.patch('/settings/telegram-sources/:chatId', AdminController.toggleTelegramSource);
router.delete('/settings/telegram-sources/:chatId', AdminController.removeTelegramSource);

export const adminRoutes = router;
