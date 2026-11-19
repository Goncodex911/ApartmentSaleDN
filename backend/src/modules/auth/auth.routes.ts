import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { rateLimit } from '../../middlewares/rate-limit.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
// Story 13.9: chống dò mật khẩu khi người khác cầm máy đang đăng nhập — 5 lần / 15 phút / tài khoản
const changePasswordLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Bạn thử quá nhiều lần, vui lòng chờ 15 phút', key: (req) => (req as AuthRequest).user!.id });
router.post('/change-password', authMiddleware, changePasswordLimit, AuthController.changePassword);

export const authRoutes = router;

