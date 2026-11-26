import { Schema, model, Document, Types } from 'mongoose';

// LISTING_*: tin CTV đăng chờ duyệt (Story 8.6)
// LEASE_EXPIRING: nhắc tái ký hợp đồng thuê (Story 11.5)
// LISTING_FLAGGED: căn bị ≥ 2 người báo lỗi (Story 13.6)
// SOURCE_AVAILABLE_AGAIN: căn Đã cọc / Đã thuê được nguồn mới đăng lại (Story 14.2)
// LEAD_DEPOSITED: CTV báo khách đã cọc căn (Story 14.8)
export const NOTIFICATION_TYPES = ['NEW_CHAT_LEAD', 'APARTMENT_MATCH', 'LISTING_SUBMITTED', 'LISTING_APPROVED', 'LISTING_REJECTED', 'LEASE_EXPIRING', 'LISTING_FLAGGED', 'SOURCE_AVAILABLE_AGAIN', 'LEAD_DEPOSITED', 'SESSION_REVOKED', 'SECURITY_ALERT', 'SERVICE_INCIDENT', 'ANNOUNCEMENT', 'TELEGRAM_DISCONNECTED'] as const; // TELEGRAM_DISCONNECTED: phiên Telegram cá nhân bị thu hồi (Story 19.2) // ANNOUNCEMENT: thông báo chung (Story 16.9) // SESSION_REVOKED: Admin đăng xuất từ xa (Story 16.4)
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Thông báo trong app (Story 6.2, 6.3) — tự xóa sau 30 ngày
export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  leadId?: Types.ObjectId;
  apartmentId?: Types.ObjectId;
  submissionId?: Types.ObjectId;
  announcementId?: Types.ObjectId; // Story 16.9
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
    submissionId: { type: Schema.Types.ObjectId, ref: 'ListingSubmission' },
    announcementId: { type: Schema.Types.ObjectId, ref: 'Announcement', index: { sparse: true } },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
// Mỗi cặp (khách, căn) chỉ báo ghép căn 1 lần — chặn trùng ngay ở tầng DB
notificationSchema.index(
  { leadId: 1, apartmentId: 1 },
  { unique: true, partialFilterExpression: { type: 'APARTMENT_MATCH' } }
);

export const Notification = model<INotification>('Notification', notificationSchema);
