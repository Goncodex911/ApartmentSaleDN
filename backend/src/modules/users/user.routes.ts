import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

// Routes riêng tư (yêu cầu đăng nhập)
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, UserController.updateProfile);

// Route công khai (dành cho khách hàng xem landing page qua ctvCode)
router.get('/ctv/:ctvCode', UserController.getPublicCtv);

export const userRoutes = router;

