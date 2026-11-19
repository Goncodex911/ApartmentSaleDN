import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { normalizeVnPhone } from '../../utils/validators.js';

const router = Router();

// Story 14.5: chống dò mật khẩu — theo SĐT (chỉ đếm lần sai, đúng thì xóa bộ đếm) + theo IP; chống tạo tài khoản hàng loạt
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_LOGINS = 'Bạn thử quá nhiều lần, vui lòng chờ 15 phút';
const loginByIp = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 30, message: TOO_MANY_LOGINS });
const loginByPhone = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10, message: TOO_MANY_LOGINS, resetOnSuccess: true, key: (req) => `phone:${normalizeVnPhone(String(req.body?.phone ?? ''))}` });
const registerByIp = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Bạn đăng ký quá nhiều tài khoản, vui lòng thử lại sau 1 giờ' });

router.post('/register', registerByIp, AuthController.register);
router.post('/login', loginByIp, loginByPhone, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
// Story 13.9: chống dò mật khẩu khi người khác cầm máy đang đăng nhập — 5 lần / 15 phút / tài khoản
const changePasswordLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Bạn thử quá nhiều lần, vui lòng chờ 15 phút', key: (req) => (req as AuthRequest).user!.id });
router.post('/change-password', authMiddleware, changePasswordLimit, AuthController.changePassword);

export const authRoutes = router;

