import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';

const router = Router();

// Routes riêng tư (yêu cầu đăng nhập)
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, UserController.updateProfile);

// Quản trị tài khoản (chỉ ADMIN): duyệt Quản lý tự đăng ký, khóa/mở khóa tài khoản
router.get('/', authMiddleware, requireRoles('ADMIN'), UserController.listUsers);
router.patch('/:id/status', authMiddleware, requireRoles('ADMIN'), UserController.updateStatus);

// Route công khai (dành cho khách hàng xem landing page qua ctvCode)
router.get('/ctv/:ctvCode', UserController.getPublicCtv);

export const userRoutes = router;

