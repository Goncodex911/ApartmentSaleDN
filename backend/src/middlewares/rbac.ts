import { Response, NextFunction } from 'express';
import { AuthRequest, readAccessToken } from './auth.js';

/**
 * Middleware phân quyền theo vai trò (RBAC - Role-Based Access Control)
 * @param allowedRoles Danh sách vai trò được phép truy cập (VD: 'ADMIN', 'MANAGER')
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware xác thực tùy chọn (Optional Auth):
 * Nếu có Bearer token thì giải mã lấy thông tin `req.user`,
 * nếu không có token vẫn cho đi tiếp (dành cho public API nhưng cần phân biệt khách vs CTV vs Quản lý).
 * Token lỗi hoặc hết hạn thì coi như khách vãng lai.
 */
export function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  req.user = readAccessToken(req) ?? undefined;
  next();
}

