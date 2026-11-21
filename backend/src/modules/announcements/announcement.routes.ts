import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { AnnouncementController } from './announcement.controller.js';

// Story 16.9 — /api/v1/announcements: thành viên xem / đóng dải ghim (phần gửi nằm ở admin.routes)
const router = Router();
router.get('/active', authMiddleware, AnnouncementController.active);
router.post('/:id/dismiss', authMiddleware, AnnouncementController.dismiss);

export const announcementRoutes = router;
