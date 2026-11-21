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
    sid?: string; // Story 16.4: jti phiên thiết bị — token cấp trước Story 16.4 không có
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
// sids: jti + prevJti (đang trong 60 giây ân hạn xoay token) của các phiên còn hạn — Story 16.4
type SessionState = Pick<IUser, 'role' | 'status' | 'tokenVersion'> & { sids: Set<string>; expiresAt: number };
const sessionCache = new Map<string, SessionState>();

export const forgetSession = (userId: string) => sessionCache.delete(userId);

async function loadSession(userId: string): Promise<SessionState | null> {
  const cached = sessionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const user = await User.findById(userId).select('role status tokenVersion refreshSessions.jti refreshSessions.prevJti refreshSessions.expiresAt').lean();
  if (!user) {
    sessionCache.delete(userId);
    return null;
  }
  const now = Date.now();
  const live = (user.refreshSessions ?? []).filter((session) => new Date(session.expiresAt).getTime() > now);
  const sids = new Set(live.flatMap((session) => [session.jti, session.prevJti].filter((id): id is string => Boolean(id))));
  const state = { role: user.role, status: user.status, tokenVersion: user.tokenVersion ?? 0, sids, expiresAt: now + SESSION_TTL_MS };
  sessionCache.set(userId, state);
  return state;
}

/**
 * Story 16.3: "Hoạt động cuối" — ghi DB tối đa 1 lần / 5 phút / người (không ghi mỗi request), chạy nền, lỗi bỏ qua.
 */
const ACTIVE_WRITE_GAP_MS = 5 * 60 * 1000;
const lastActiveWrites = new Map<string, number>();
function touchActivity(userId: string) {
  const now = Date.now();
  if ((lastActiveWrites.get(userId) ?? 0) > now - ACTIVE_WRITE_GAP_MS) return;
  if (lastActiveWrites.size > 5000) lastActiveWrites.clear();
  lastActiveWrites.set(userId, now);
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } }).catch(() => lastActiveWrites.delete(userId));
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
  // Story 16.4: token mang sid của phiên đã bị đăng xuất từ xa → hết hiệu lực ngay (token cũ không có sid vẫn nhận tới khi hết hạn)
  const revoked = user.sid !== undefined && !state?.sids.has(user.sid);
  if (!state || state.status !== 'ACTIVE' || (user.tv ?? 0) !== state.tokenVersion || user.role !== state.role || revoked) {
    return { error: SESSION_INVALID };
  }
  touchActivity(user.id);
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
