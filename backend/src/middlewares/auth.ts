import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { User, IUser } from '../modules/auth/user.model.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'MANAGER' | 'COLLABORATOR';
    ctvCode: string;
    tv?: number; // tokenVersion lúc cấp token (Story 13.2) — token cũ không có = 0
  };
}

/**
 * Giải mã Access Token từ header "Bearer ...". Trả về null nếu thiếu/sai/hết hạn.
 * Từ chối refresh token (type: 'refresh', hạn 7 ngày) — chỉ được dùng ở /auth/refresh.
 * CHỈ kiểm tra chữ ký — muốn biết tài khoản còn hiệu lực thì dùng `resolveSession`.
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

/**
 * Story 13.2 — vô hiệu hóa phiên mà không truy vấn DB ở mọi request: trạng thái tài khoản được nhớ 30 giây.
 * Admin khóa / đổi vai trò → `forgetSession` xóa bản nhớ ngay (hiệu lực tức thì trên server này);
 * server khác (nếu sau này chạy nhiều bản) chậm tối đa 30 giây.
 */
const SESSION_TTL_MS = 30_000;
type SessionState = Pick<IUser, 'role' | 'status' | 'tokenVersion'> & { expiresAt: number };
const sessionCache = new Map<string, SessionState>();

export const forgetSession = (userId: string) => sessionCache.delete(userId);

async function loadSession(userId: string): Promise<SessionState | null> {
  const cached = sessionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const user = await User.findById(userId).select('role status tokenVersion').lean();
  if (!user) {
    sessionCache.delete(userId);
    return null;
  }
  const state = { role: user.role, status: user.status, tokenVersion: user.tokenVersion ?? 0, expiresAt: Date.now() + SESSION_TTL_MS };
  sessionCache.set(userId, state);
  return state;
}

const SESSION_INVALID = { status: 401, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' };
const ACCOUNT_BLOCKED = { status: 403, code: 'ACCOUNT_BLOCKED', message: 'Tài khoản đã bị khóa' };

/**
 * Token hợp lệ + tài khoản còn hiệu lực. Vai trò trong token khác DB (vừa được đổi vai trò) → 401
 * để app tự gọi /auth/refresh nhận token mang vai trò mới, không phải đăng nhập lại.
 */
export async function resolveSession(req: Request): Promise<{ user?: AuthRequest['user']; error?: typeof SESSION_INVALID & { code?: string } }> {
  const user = readAccessToken(req);
  if (!user) return { error: SESSION_INVALID };
  const state = await loadSession(user.id);
  if (state?.status === 'BLOCKED') return { error: ACCOUNT_BLOCKED };
  if (!state || state.status !== 'ACTIVE' || (user.tv ?? 0) !== state.tokenVersion || user.role !== state.role) {
    return { error: SESSION_INVALID };
  }
  return { user };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  resolveSession(req)
    .then(({ user, error }) => {
      if (error) {
        res.status(error.status).json({ success: false, message: error.message, code: error.code });
        return;
      }
      req.user = user;
      next();
    })
    .catch(next);
}
