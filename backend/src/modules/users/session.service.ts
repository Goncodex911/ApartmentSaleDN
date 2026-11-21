import { createHash } from 'node:crypto';
import { User } from '../auth/user.model.js';
import { forgetSession } from '../../middlewares/auth.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { findTarget, userTarget } from './user.service.js';
import { deviceOf } from '../../utils/user-agent.js';

// Không bao giờ trả jti thật cho trình duyệt: id phiên = 12 ký tự đầu của sha256(jti)
export const sessionKey = (jti: string) => createHash('sha256').update(jti).digest('hex').slice(0, 12);

/**
 * Story 16.4: danh sách thiết bị đang đăng nhập + đăng xuất từ xa (1 thiết bị / tất cả).
 * Thu hồi → gỡ khỏi refreshSessions + xóa bộ nhớ phiên → access token mang sid đó bị từ chối ở request kế tiếp.
 */
export class SessionService {
  /** `currentSid`: jti trong access token của người đang xem → đánh dấu "Thiết bị này". */
  static async list(userId: string, currentSid?: string) {
    const user = await User.findById(userId).select('refreshSessions').lean();
    if (!user) throw { status: 404, message: 'Không tìm thấy người dùng' };
    const now = Date.now();
    return user.refreshSessions
      .filter((session) => new Date(session.expiresAt).getTime() > now)
      .map((session) => ({
        id: sessionKey(session.jti),
        userAgent: session.userAgent ?? '',
        ip: session.ip ?? '',
        createdAt: session.createdAt ?? null,
        lastUsedAt: session.lastUsedAt ?? session.rotatedAt ?? null,
        current: Boolean(currentSid) && (session.jti === currentSid || session.prevJti === currentSid),
      }))
      .sort((a, b) => new Date(b.lastUsedAt ?? 0).getTime() - new Date(a.lastUsedAt ?? 0).getTime());
  }

  static async revoke(actor: AuditActor, userId: string, id: string) {
    const user = await findTarget(userId);
    const session = user.refreshSessions.find((item) => sessionKey(item.jti) === id);
    if (!session) throw { status: 404, message: 'Phiên này đã hết hạn hoặc đã đăng xuất' };
    await User.updateOne({ _id: user._id }, { $pull: { refreshSessions: { jti: session.jti } } });
    forgetSession(userId);
    const device = deviceOf(session.userAgent);
    AuditService.log(actor, 'REVOKE_SESSION', userTarget(user), { device, ip: session.ip });
    this.notifyOwner(actor, userId, `Quản trị viên đã đăng xuất tài khoản của bạn trên ${device}.`);
  }

  /** Đăng xuất mọi thiết bị: tăng tokenVersion (KHÔNG khóa tài khoản — đăng nhập lại được ngay). */
  static async revokeAll(actor: AuditActor, userId: string) {
    const user = await findTarget(userId);
    await User.updateOne({ _id: user._id }, { $set: { refreshSessions: [] }, $inc: { tokenVersion: 1 } });
    forgetSession(userId);
    AuditService.log(actor, 'REVOKE_ALL_SESSIONS', userTarget(user), { sessions: user.refreshSessions.length });
    this.notifyOwner(actor, userId, 'Quản trị viên đã đăng xuất tài khoản của bạn trên mọi thiết bị. Vui lòng đăng nhập lại.');
  }

  // Chỉ báo khi người khác (Admin) đăng xuất hộ — tự đăng xuất máy khác của mình thì không cần
  private static notifyOwner(actor: AuditActor, userId: string, body: string) {
    if (actor.id === userId) return;
    NotificationService.notify({ userId, type: 'SESSION_REVOKED', title: 'Tài khoản bị đăng xuất từ xa', body }).catch(() => undefined);
  }
}
