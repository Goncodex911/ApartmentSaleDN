import { Request, Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { normalizeVnPhone } from '../../utils/validators.js';
import { AuditService } from '../audit/audit.service.js';
import { maskPhone } from '../audit/audit-actions.js';
import { requestContext } from '../../utils/request-context.js';

const router = Router();

// Story 14.5: chống dò mật khẩu — theo SĐT (chỉ đếm lần sai, đúng thì xóa bộ đếm) + theo IP; chống tạo tài khoản hàng loạt
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_LOGINS = 'Bạn thử quá nhiều lần, vui lòng chờ 15 phút';
const loginByIp = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 30, message: TOO_MANY_LOGINS });
// Story 16.2: SĐT bị chặn → ghi LOGIN_BLOCKED tối đa 1 lần / 15 phút / SĐT (kẻ dò gửi tiếp cũng không làm đầy nhật ký)
const blockedLoggedAt = new Map<string, number>();
const logLoginBlocked = (req: Request, key: string) => {
  const now = Date.now();
  if ((blockedLoggedAt.get(key) ?? 0) > now - FIFTEEN_MINUTES) return;
  if (blockedLoggedAt.size > 5000) blockedLoggedAt.clear();
  blockedLoggedAt.set(key, now);
  const phone = maskPhone(key.slice('phone:'.length));
  AuditService.log({ id: '', role: '', ...requestContext(req) }, 'LOGIN_BLOCKED', { type: 'AUTH', title: phone }, { phone });
};
const loginByPhone = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10, message: TOO_MANY_LOGINS, resetOnSuccess: true, key: (req) => `phone:${normalizeVnPhone(String(req.body?.phone ?? ''))}`, onLimit: logLoginBlocked });
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

