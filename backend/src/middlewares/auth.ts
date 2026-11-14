import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'MANAGER' | 'COLLABORATOR';
    ctvCode: string;
  };
}

/**
 * Giải mã Access Token từ header "Bearer ...". Trả về null nếu thiếu/sai/hết hạn.
 * Từ chối refresh token (type: 'refresh', hạn 7 ngày) — chỉ được dùng ở /auth/refresh.
 */
export function readAccessToken(req: Request): AuthRequest['user'] | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthRequest['user'] & { type?: string };
    return decoded.type === 'refresh' ? null : decoded;
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = readAccessToken(req);
  if (!user) {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    return;
  }
  req.user = user;
  next();
}
