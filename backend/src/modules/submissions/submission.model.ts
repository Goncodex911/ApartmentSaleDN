import { Schema, model, Document, Types } from 'mongoose';
import type { SubmissionData } from './submission.validation.js';

// Ảnh CTV tải lên cho tin chờ duyệt nằm riêng thư mục này → dọn ảnh tin bị từ chối / rút không đụng ảnh căn trong kho
export const SUBMISSION_MEDIA_FOLDER = 'apartment_sale/submissions';
export const MAX_PENDING_PER_CTV = 20;

export const SUBMISSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/**
 * Tin CTV đăng — hàng chờ duyệt riêng (Story 8.6), KHÔNG nằm trong kho căn hộ
 * → không xuất hiện ở tìm kiếm, ghép khách, chia sẻ, chat AI cho tới khi Quản lý duyệt.
 */
export interface IListingSubmission extends Document {
  ctvId: Types.ObjectId;
  status: SubmissionStatus;
  data: SubmissionData; // Cùng cấu trúc form Thêm căn, đã kiểm tra bằng createApartmentSchema
  rejectReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  apartmentId?: Types.ObjectId; // Căn trong kho sau khi duyệt (căn mới hoặc căn đã gộp vào)
  merged?: boolean;
  mediaCleanedAt?: Date; // Đã dọn ảnh trên Cloudinary (tin bị từ chối / rút quá 30 ngày)
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<IListingSubmission>(
  {
    ctvId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'PENDING' },
    data: { type: Schema.Types.Mixed, required: true },
    rejectReason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
    merged: { type: Boolean },
    mediaCleanedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);

submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ ctvId: 1, createdAt: -1 });

export const ListingSubmission = model<IListingSubmission>('ListingSubmission', submissionSchema);
