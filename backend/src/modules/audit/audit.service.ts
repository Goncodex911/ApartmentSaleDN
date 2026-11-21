import { z } from 'zod';
import { User } from '../auth/user.model.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { requestContext } from '../../utils/request-context.js';
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_SEVERITIES, AuditAction, AuditLog, AuditTargetType, IAuditLog } from './audit-log.model.js';
import { ACTION_META, NORMAL_RETENTION_MS } from './audit-actions.js';

/** Người thực hiện kèm IP + thiết bị — controller tạo bằng `auditActor(req)` rồi truyền xuống service. */
export type AuditActor = { id: string; role: string; ip?: string; userAgent?: string; name?: string };
type Target = { type: AuditTargetType; id?: unknown; title?: string };

// IP + thiết bị lấy chung với requestContext (req.ip đã là IP thật khi bật TRUST_PROXY — không đọc x-forwarded-for thủ công)
export const auditActor = (req: AuthRequest): AuditActor => ({ id: req.user!.id, role: req.user!.role, ...requestContext(req) });

const csvList = <T extends readonly [string, ...string[]]>(values: T) => z.string().transform((value) => value.split(',')).pipe(z.array(z.enum(values))).optional();

export const listAuditLogsQuerySchema = z.object({
  // Nhiều giá trị cách nhau dấu phẩy (VD tab "Tài khoản" gồm 4 hành động)
  action: csvList(AUDIT_ACTIONS),
  category: csvList(AUDIT_CATEGORIES),
  severity: csvList(AUDIT_SEVERITIES),
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã người dùng không hợp lệ').optional(),
  search: z.string().trim().max(80).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
type ListQuery = z.infer<typeof listAuditLogsQuerySchema>;

// Chống ghi trùng trong bộ nhớ: xem SĐT chủ 1 lần / 10 phút; sửa cùng 1 căn liên tiếp trong 2 phút gộp vào 1 mục
const CONTACT_VIEW_THROTTLE_MS = 10 * 60 * 1000;
const MERGE_WINDOW_MS = 2 * 60 * 1000;
const recentContactViews = new Map<string, number>();
const recentUpdates = new Map<string, { at: number; logId: Promise<unknown>; changes: Record<string, { from: unknown; to: unknown }> }>();
const capSize = (map: Map<string, unknown>) => map.size > 5000 && map.clear(); // Chặn bộ nhớ phình ra

// Story 16.5 gắn bộ phát hiện bất thường vào đây (chạy sau khi ghi, lỗi không ảnh hưởng)
type Listener = (entry: Pick<IAuditLog, 'action' | 'userRole' | 'details' | 'userAgent'> & { userId?: string; userName: string }) => void;
const listeners: Listener[] = [];
export const onAuditLogged = (listener: Listener) => listeners.push(listener);

const MAX_EXPORT_ROWS = 10_000;

export class AuditService {
  /**
   * Ghi nhật ký chạy ngầm (Story 13.3): API chính không chờ, lỗi ghi log không làm hỏng thao tác của người dùng.
   * Story 16.2: nhóm + mức độ suy ra từ hành động; mục Thông thường tự xóa sau 60 ngày (expiresAt), còn lại 180 ngày.
   * actor không có `id` chỉ được ghi với nhóm đăng nhập (VD đăng nhập sai bằng SĐT lạ).
   */
  static log(actor: AuditActor | undefined, action: AuditAction, target: Target, details?: Record<string, unknown>) {
    const meta = ACTION_META[action];
    if (!actor?.id && meta.category !== 'AUTH') return Promise.resolve(undefined);
    const write = async () => {
      const name = actor?.name ?? (actor?.id ? (await User.findById(actor.id).select('name').lean())?.name : '') ?? '';
      const entry = await AuditLog.create({
        userId: actor?.id || undefined,
        userName: name,
        userRole: actor?.role ?? '',
        action,
        category: meta.category,
        severity: meta.severity,
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title || '',
        details,
        ipAddress: actor?.ip,
        userAgent: actor?.userAgent,
        expiresAt: meta.severity === 'NORMAL' ? new Date(Date.now() + NORMAL_RETENTION_MS) : undefined,
      });
      for (const listener of listeners) {
        try {
          listener({ action, userId: actor?.id, userName: name, userRole: actor?.role ?? '', details, userAgent: actor?.userAgent });
        } catch (err) {
          console.error('[Audit] Lỗi bộ phát hiện:', (err as Error).message);
        }
      }
      return entry._id;
    };
    return write().catch((err) => console.error('[Audit] Lỗi ghi nhật ký:', err.message));
  }

  /**
   * Quản lý mở chi tiết căn có SĐT chủ nhà (Story 13.3 — Cách B). Cùng người + cùng căn chỉ ghi 1 lần / 10 phút:
   * mở đi mở lại 1 căn không làm đầy nhật ký (Atlas gói free).
   */
  static logContactView(actor: AuditActor, apartment: { _id: unknown; title?: string }): void {
    const key = `${actor.id}:${String(apartment._id)}`;
    const now = Date.now();
    if ((recentContactViews.get(key) ?? 0) > now - CONTACT_VIEW_THROTTLE_MS) return;
    capSize(recentContactViews);
    recentContactViews.set(key, now);
    this.log(actor, 'UNMASK_OWNER_CONTACT', { type: 'APARTMENT', id: apartment._id, title: apartment.title });
  }

  /**
   * Story 16.2: sửa căn — chỉ ghi các trường đã đổi (trước → sau). Cùng người sửa cùng căn trong 2 phút → gộp vào mục trước
   * (giữ giá trị "trước" đầu tiên, "sau" mới nhất) để Atlas gói free không đầy vì bấm Lưu nhiều lần.
   */
  static logApartmentUpdate(actor: AuditActor, target: Target, changes: Record<string, { from: unknown; to: unknown }>): void {
    if (!Object.keys(changes).length) return;
    const key = `${actor.id}:${String(target.id)}`;
    const now = Date.now();
    const recent = recentUpdates.get(key);
    if (recent && recent.at > now - MERGE_WINDOW_MS) {
      for (const [field, change] of Object.entries(changes)) recent.changes[field] = { from: recent.changes[field]?.from ?? change.from, to: change.to };
      recent.at = now;
      recent.logId
        .then((id) => id && AuditLog.updateOne({ _id: id }, { $set: { details: { changes: recent.changes } } }))
        .catch((err) => console.error('[Audit] Lỗi gộp nhật ký:', err.message));
      return;
    }
    capSize(recentUpdates);
    const merged = { ...changes };
    recentUpdates.set(key, { at: now, changes: merged, logId: this.log(actor, 'UPDATE_APARTMENT', target, { changes: merged }) });
  }

  private static buildFilter({ action, category, severity, userId, search, from, to }: ListQuery) {
    const filter: Record<string, unknown> = {};
    if (action?.length) filter.action = { $in: action };
    if (category?.length) filter.category = { $in: category };
    if (severity?.length) filter.severity = { $in: severity };
    if (userId) filter.userId = userId;
    if (from || to) filter.createdAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ userName: pattern }, { targetTitle: pattern }];
    }
    return filter;
  }

  // [ADMIN] Tra cứu nhật ký — mới nhất trước, lọc hành động / nhóm / mức độ / người / thời gian, tìm theo tên người hoặc tên căn
  static async list(query: ListQuery) {
    const filter = this.buildFilter(query);
    const { page, limit } = query;
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /** [ADMIN] Story 16.2: xuất CSV theo bộ lọc hiện tại (tối đa 10.000 dòng), UTF-8 BOM để Excel đọc đúng tiếng Việt. */
  static async exportCsv(query: ListQuery, actor: AuditActor) {
    const rows = await AuditLog.find(this.buildFilter(query)).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();
    // Ô bắt đầu bằng = + - @ bị Excel hiểu là công thức (CSV injection) → thêm dấu ' phía trước (giống utils/csv.ts frontend)
    const cell = (value: unknown) => {
      const text = String(value ?? '');
      return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    };
    const lines = rows.map((row) =>
      [row.createdAt.toISOString(), row.userName, row.userRole, ACTION_META[row.action]?.label ?? row.action, row.severity, row.targetTitle, row.details ? JSON.stringify(row.details) : '', row.ipAddress, row.userAgent]
        .map(cell)
        .join(',')
    );
    const header = ['Thời gian (UTC)', 'Người thực hiện', 'Vai trò', 'Hành động', 'Mức độ', 'Đối tượng', 'Chi tiết', 'IP', 'Thiết bị'].map(cell).join(',');
    const { page: _page, limit: _limit, ...filters } = query;
    this.log(actor, 'EXPORT_AUDIT_CSV', { type: 'SETTINGS', title: 'Nhật ký hoạt động' }, { filters, rows: rows.length });
    return `﻿${[header, ...lines].join('\r\n')}`;
  }
}
