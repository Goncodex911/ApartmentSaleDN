import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.validation.js';
import { auditActor } from '../audit/audit.service.js';
import { requestContext } from '../../utils/request-context.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { runDailyJobsIfDue } from '../jobs/daily-jobs.js';

// Cấu hình cookie HttpOnly cho Refresh Token
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

/**
 * Giao diện gọi THẲNG backend từ tên miền khác (Cloudflare Pages → onrender.com) không dùng được cookie
 * (SameSite=Lax không gửi khác trang; Safari chặn cookie bên thứ ba) → giao diện gửi header X-Token-Transport: body,
 * backend trả Refresh Token trong JSON và nhận lại qua body. Netlify / local (cùng tên miền qua proxy) vẫn chỉ dùng cookie HttpOnly.
 */
const wantsBodyToken = (req: Request) => req.get('x-token-transport') === 'body';

const issueRefreshToken = (req: Request, res: Response, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  return wantsBodyToken(req) ? { refreshToken } : {};
};

const readRefreshToken = (req: Request): string | undefined =>
  req.cookies?.refreshToken || (wantsBodyToken(req) && typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined);

export class AuthController {
  // Đăng ký tài khoản mới
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData, requestContext(req));

      if ('pendingApproval' in result) {
        res.status(201).json({
          success: true,
          message: 'Đăng ký thành công! Tài khoản Quản lý cần ADMIN duyệt trước khi đăng nhập.',
          data: { user: result.user, pendingApproval: true },
        });
        return;
      }

      const { user, accessToken, refreshToken } = result;
      const tokenBody = issueRefreshToken(req, res, refreshToken);
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: { user, accessToken, ...tokenBody },
      });
    } catch (error) {
      next(error);
    }
  }

  // Đăng nhập
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login(validatedData, requestContext(req));

      const tokenBody = issueRefreshToken(req, res, refreshToken);
      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: { user, accessToken, ...tokenBody },
      });
    } catch (error) {
      next(error);
    }
  }

  // Cấp lại Access Token từ Refresh Token (HttpOnly Cookie) — xoay vòng cấp luôn refresh token mới
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.refresh(readRefreshToken(req), requestContext(req));
      const tokenBody = issueRefreshToken(req, res, refreshToken);
      res.status(200).json({ success: true, data: { user, accessToken, ...tokenBody } });
    } catch (error) {
      res.clearCookie('refreshToken');
      next(error);
    }
  }

  // Đăng xuất — Story 14.5: thu hồi phiên của thiết bị này (lỗi vẫn xóa cookie, vẫn trả 200)
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(readRefreshToken(req), requestContext(req)).catch(() => undefined);
      res.clearCookie('refreshToken');
      res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/change-password — tự đổi mật khẩu (Story 13.9)
  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.changePassword(auditActor(req), changePasswordSchema.parse(req.body));
      const tokenBody = issueRefreshToken(req, res, refreshToken);
      res.status(200).json({ success: true, message: 'Đã đổi mật khẩu', data: { user, accessToken, ...tokenBody } });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin cá nhân hiện tại
  static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      // Story 11.5: lần mở app đầu tiên trong ngày kích hoạt việc hằng ngày (chạy nền, không làm chậm phản hồi)
      runDailyJobsIfDue().catch((err) => console.error('[Việc hằng ngày] Lỗi:', err.message));
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

