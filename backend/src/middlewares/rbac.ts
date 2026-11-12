import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

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
 */
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'apartment_default_secret_key_change_me';

export function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
      req.user = decoded;
    } catch (_err) {
      // Token lỗi hoặc hết hạn thì bỏ qua, coi như khách vãng lai
    }
  }
  next();
}

