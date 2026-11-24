import { Schema, model, Types } from 'mongoose';

// Story 13.3: thao tác trọng yếu được ghi vết (13.2 thêm thao tác tài khoản) — Story 16.2 mở rộng ra mọi thao tác ghi dữ liệu
export const AUDIT_ACTIONS = [
  'UNMASK_OWNER_CONTACT',
  'CHANGE_STATUS',
  'UPDATE_PRICE',
  'DELETE_APARTMENT',
  'APPROVE_SUBMISSION',
  'REJECT_SUBMISSION',
  'CHANGE_USER_STATUS',
  'CHANGE_ROLE',
  'RESET_PASSWORD',
  'CHANGE_PASSWORD', // Story 13.9: người dùng tự đổi mật khẩu
  'DISMISS_REPORT', // Story 13.6: "Tin vẫn đúng" — gỡ cờ báo lỗi
  // Story 16.2
  'LOGIN',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED',
  'LOGOUT',
  'CREATE_APARTMENT',
  'UPDATE_APARTMENT',
  'ADD_SUBLISTING',
  'REMOVE_SUBLISTING',
  'RENEW_LEASE',
  'AI_IMPORT',
  'SUBMIT_LISTING',
  'UPDATE_SUBMISSION',
  'WITHDRAW_SUBMISSION',
  'CREATE_REPORT',
  'RESOLVE_REPORT',
  'CREATE_SHARE_LINK',
  'UPDATE_SETTINGS',
  'ADD_TELEGRAM_SOURCE',
  'TOGGLE_TELEGRAM_SOURCE',
  'REMOVE_TELEGRAM_SOURCE',
  'EXPORT_AUDIT_CSV',
  // Story 16.6
  'CREATE_USER',
  'UPDATE_USER',
  'ADD_USER_NOTE',
  'DELETE_USER_NOTE',
  // Story 16.4
  'REVOKE_SESSION',
  'REVOKE_ALL_SESSIONS',
  // Story 16.7
  'RESTORE_APARTMENT',
  'PURGE_APARTMENT',
  // Story 16.9
  'SEND_ANNOUNCEMENT',
  'REVOKE_ANNOUNCEMENT',
  // Cào tin Telegram cho Quản lý (CE-02): Admin theo dõi ai kết nối / quét / đón tin
  'CONNECT_TELEGRAM_ACCOUNT',
  'DISCONNECT_TELEGRAM_ACCOUNT',
  'TELEGRAM_SCRAPE',
  'TOGGLE_TELEGRAM_LISTENER',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_CATEGORIES = ['AUTH', 'INVENTORY', 'SUBMISSION', 'SHARE', 'ACCOUNT', 'ADMIN'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export const AUDIT_SEVERITIES = ['NORMAL', 'IMPORTANT', 'SECURITY'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_TARGET_TYPES = ['APARTMENT', 'SUBMISSION', 'USER', 'SETTINGS', 'SHARE_LINK', 'REPORT', 'AUTH'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

// Mức trần 180 ngày (TTL theo createdAt — index cũ trên Atlas, GIỮ NGUYÊN). Mục Thông thường còn có expiresAt = 60 ngày (Story 16.2)
const RETENTION_SECONDS = 180 * 24 * 60 * 60;

export interface IAuditLog {
  _id: Types.ObjectId;
  userId?: Types.ObjectId; // Trống: đăng nhập sai bằng SĐT không thuộc tài khoản nào
  userName: string;
  userRole: string;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  targetType: AuditTargetType;
  targetId?: Types.ObjectId;
  targetTitle: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String, default: '' },
    userRole: { type: String, default: '' },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    category: { type: String, enum: AUDIT_CATEGORIES },
    severity: { type: String, enum: AUDIT_SEVERITIES },
    targetType: { type: String, enum: AUDIT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, index: true },
    targetTitle: { type: String, default: '' },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' }
);
auditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: RETENTION_SECONDS });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Mục không có expiresAt không bị index này xóa
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
