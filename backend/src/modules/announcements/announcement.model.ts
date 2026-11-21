import { Schema, model, Types } from 'mongoose';

// Story 16.9: thông báo chung từ Admin — tự xóa sau 90 ngày
export const AUDIENCES = ['ALL', 'COLLABORATOR', 'MANAGER'] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface IAnnouncement {
  _id: Types.ObjectId;
  title: string;
  body: string; // Chữ thường, không HTML (frontend hiển thị dạng text)
  audience: Audience;
  pinnedUntil: Date;
  sentBy: Types.ObjectId;
  sentByName: string;
  recipientCount: number;
  viaTelegram: boolean;
  revokedAt?: Date;
  dismissedBy: Types.ObjectId[]; // Người đã bấm đóng dải ghim (đồng bộ mọi thiết bị)
  createdAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, maxlength: 80 },
    body: { type: String, required: true, maxlength: 500 },
    audience: { type: String, enum: AUDIENCES, required: true },
    pinnedUntil: { type: Date, required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentByName: { type: String, default: '' },
    recipientCount: { type: Number, default: 0 },
    viaTelegram: { type: Boolean, default: false },
    revokedAt: { type: Date },
    dismissedBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'announcements' }
);
announcementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
announcementSchema.index({ pinnedUntil: -1 });

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);
