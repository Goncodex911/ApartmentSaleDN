import { Schema, model, Document, Types } from 'mongoose';

// Link xem phòng công khai: mỗi cặp (căn hộ, CTV) có đúng 1 link và bộ đếm lượt xem riêng (Story 5.3)
export interface IShareLink extends Document {
  code: string;
  apartmentId: Types.ObjectId;
  ctvId: Types.ObjectId;
  views: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    code: { type: String, required: true, unique: true },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true },
    ctvId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
  },
  { timestamps: true }
);

shareLinkSchema.index({ apartmentId: 1, ctvId: 1 }, { unique: true });

export const ShareLink = model<IShareLink>('ShareLink', shareLinkSchema);
