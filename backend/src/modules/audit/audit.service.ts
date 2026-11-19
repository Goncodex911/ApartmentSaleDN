import { z } from 'zod';
import { User } from '../auth/user.model.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { AUDIT_ACTIONS, AuditAction, AuditLog, AuditTargetType } from './audit-log.model.js';

/** Người thực hiện kèm IP + thiết bị — controller tạo bằng `auditActor(req)` rồi truyền xuống service. */
export type AuditActor = { id: string; role: string; ip?: string; userAgent?: string };

// req.ip đã là IP thật khi bật TRUST_PROXY (Render) — không đọc x-forwarded-for thủ công vì giả mạo được
export const auditActor = (req: AuthRequest): AuditActor => ({
  id: req.user!.id,
  role: req.user!.role,
  ip: req.ip,
  userAgent: req.get('user-agent')?.slice(0, 200),
});

export const listAuditLogsQuerySchema = z.object({
  // Nhiều hành động cách nhau dấu phẩy (VD tab "Tài khoản" gồm 3 hành động)
  action: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(z.enum(AUDIT_ACTIONS)))
    .optional(),
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã người dùng không hợp lệ').optional(),
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const CONTACT_VIEW_THROTTLE_MS = 10 * 60 * 1000;
const recentContactViews = new Map<string, number>();

export class AuditService {
  /**
   * Ghi nhật ký chạy ngầm (Story 13.3): API chính không chờ, lỗi ghi log không làm hỏng thao tác của người dùng.
   * Chỉ actor có `id` mới ghi (luồng nền như bot Telegram không có người thực hiện).
   */
  static log(actor: AuditActor | undefined, action: AuditAction, target: { type: AuditTargetType; id: unknown; title?: string }, details?: Record<string, unknown>): void {
    if (!actor?.id) return;
    (async () => {
      const user = await User.findById(actor.id).select('name').lean();
      await AuditLog.create({
        userId: actor.id,
        userName: user?.name || '',
        userRole: actor.role,
        action,
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title || '',
        details,
        ipAddress: actor.ip,
        userAgent: actor.userAgent,
      });
    })().catch((err) => console.error('[Audit] Lỗi ghi nhật ký:', err.message));
  }

  /**
   * Quản lý mở chi tiết căn có SĐT chủ nhà (Story 13.3 — Cách B). Cùng người + cùng căn chỉ ghi 1 lần / 10 phút:
   * mở đi mở lại 1 căn không làm đầy nhật ký (Atlas gói free).
   */
  static logContactView(actor: AuditActor, apartment: { _id: unknown; title?: string }): void {
    const key = `${actor.id}:${String(apartment._id)}`;
    const now = Date.now();
    if ((recentContactViews.get(key) ?? 0) > now - CONTACT_VIEW_THROTTLE_MS) return;
    if (recentContactViews.size > 5000) recentContactViews.clear(); // Chặn bộ nhớ phình ra
    recentContactViews.set(key, now);
    this.log(actor, 'UNMASK_OWNER_CONTACT', { type: 'APARTMENT', id: apartment._id, title: apartment.title });
  }

  // [ADMIN] Tra cứu nhật ký — mới nhất trước, lọc hành động / người thực hiện, tìm theo tên người hoặc tên căn
  static async list({ action, userId, search, page, limit }: z.infer<typeof listAuditLogsQuerySchema>) {
    const filter: Record<string, unknown> = {};
    if (action?.length) filter.action = { $in: action };
    if (userId) filter.userId = userId;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ userName: pattern }, { targetTitle: pattern }];
    }
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
