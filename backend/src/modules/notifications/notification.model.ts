import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'NEW_CHAT_LEAD' | 'APARTMENT_MATCH';

// Thông báo trong app (Story 6.2, 6.3) — tự xóa sau 30 ngày
export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  leadId?: Types.ObjectId;
  apartmentId?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['NEW_CHAT_LEAD', 'APARTMENT_MATCH'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
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
