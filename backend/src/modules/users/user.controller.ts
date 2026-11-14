import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import { updateProfileSchema, updateUserStatusSchema, listUsersQuerySchema } from './user.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';

export class UserController {
  // Xem hồ sơ cá nhân hiện tại
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getProfile(req.user!.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật hồ sơ cá nhân
  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      const updatedUser = await UserService.updateProfile(req.user!.id, validatedData);
      res.status(200).json({
        success: true,
        message: 'Cập nhật hồ sơ thành công',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  // [ADMIN] GET /api/v1/users?status=PENDING — danh sách tài khoản chờ duyệt
  static async listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = listUsersQuerySchema.parse(req.query);
      const users = await UserService.listByStatus(status);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  // [ADMIN] PATCH /api/v1/users/:id/status — duyệt (ACTIVE) hoặc khóa (BLOCKED) tài khoản
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = updateUserStatusSchema.parse(req.body);
      const user = await UserService.updateStatus(String(req.params.id), status);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái tài khoản thành công', data: user });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin công khai của CTV theo ctvCode (Public)
  static async getPublicCtv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctvCode = Array.isArray(req.params.ctvCode) ? req.params.ctvCode[0] : req.params.ctvCode;
      const ctv = await UserService.getPublicCtvByCode(ctvCode);
      res.status(200).json({ success: true, data: ctv });
    } catch (error) {
      next(error);
    }
  }
}

