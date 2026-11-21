import { Schema, model, Types } from 'mongoose';

// Story 16.5: cảnh báo hành vi bất thường — tự xóa sau 180 ngày
export const ALERT_RULES = ['OWNER_CONTACT_SCRAPE', 'LOGIN_BRUTE_FORCE', 'MASS_DELETE', 'NEW_DEVICE_PRIVILEGED'] as const;
export type AlertRule = (typeof ALERT_RULES)[number];

export interface ISecurityAlert {
  _id: Types.ObjectId;
  rule: AlertRule;
  severity: 'IMPORTANT' | 'SECURITY';
  key: string; // userId hoặc SĐT đã che — cùng quy tắc + cùng key chỉ 1 cảnh báo / giờ
  windowStart: Date; // Đầu giờ phát hiện
  userId?: Types.ObjectId;
  subject: string; // Tên người / SĐT đã che
  message: string;
  count: number;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const securityAlertSchema = new Schema<ISecurityAlert>(
  {
    rule: { type: String, enum: ALERT_RULES, required: true },
    severity: { type: String, enum: ['IMPORTANT', 'SECURITY'], required: true },
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    count: { type: Number, default: 1 },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'security_alerts' }
);
securityAlertSchema.index({ rule: 1, key: 1, windowStart: 1 }, { unique: true }); // Chống trùng khi phát hiện đồng thời
securityAlertSchema.index({ resolvedAt: 1, createdAt: -1 });
securityAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const SecurityAlert = model<ISecurityAlert>('SecurityAlert', securityAlertSchema);
