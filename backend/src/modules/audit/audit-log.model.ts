import { Schema, model, Types } from 'mongoose';

// Story 13.3: thao tác trọng yếu được ghi vết (Story 13.2 thêm các thao tác trên tài khoản)
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
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = 'APARTMENT' | 'SUBMISSION' | 'USER';

// Giữ 180 ngày rồi tự xóa (TTL) — không làm đầy Atlas gói free 512MB
const RETENTION_SECONDS = 180 * 24 * 60 * 60;

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  userRole: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: Types.ObjectId;
  targetTitle: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '' },
    userRole: { type: String, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, enum: ['APARTMENT', 'SUBMISSION', 'USER'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetTitle: { type: String, default: '' },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' }
);
auditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
