import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { NotificationController } from './notification.controller.js';

// Thông báo trong app (Story 6.3): frontend hỏi định kỳ 30 giây
const router = Router();
router.use(authMiddleware);

router.get('/', NotificationController.list);
router.patch('/read-all', NotificationController.markAllRead);
router.patch('/:id/read', NotificationController.markRead);

export const notificationRoutes = router;
