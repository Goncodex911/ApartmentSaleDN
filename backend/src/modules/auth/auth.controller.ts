import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';

// Cấu hình cookie HttpOnly cho Refresh Token
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

export class AuthController {
  // Đăng ký tài khoản mới
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData);

      if ('pendingApproval' in result) {
        res.status(201).json({
          success: true,
          message: 'Đăng ký thành công! Tài khoản Quản lý cần ADMIN duyệt trước khi đăng nhập.',
          data: { user: result.user, pendingApproval: true },
        });
        return;
      }

      const { user, accessToken, refreshToken } = result;
      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  // Đăng nhập
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login(validatedData);

      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  // Cấp lại Access Token từ Refresh Token (HttpOnly Cookie) — xoay vòng cấp luôn refresh token mới
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.refresh(req.cookies?.refreshToken);
      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      res.status(200).json({ success: true, data: { user, accessToken } });
    } catch (error) {
      res.clearCookie('refreshToken');
      next(error);
    }
  }

  // Đăng xuất
  static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('refreshToken');
      res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin cá nhân hiện tại
  static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

