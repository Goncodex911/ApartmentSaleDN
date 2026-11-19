import { Schema, model, Types } from 'mongoose';

// Story 13.6 (gộp 11.4b): CTV / Quản lý báo lỗi tin căn
export const REPORT_REASONS = ['RENTED', 'PRICE_CHANGED', 'UNREACHABLE', 'WRONG_PHOTOS'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface IListingReport {
  _id: Types.ObjectId;
  apartmentId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: ReportReason;
  note?: string;
  newPrice?: number; // "Chủ tăng giá" — giá mới CTV nghe được
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const listingReportSchema = new Schema<IListingReport>(
  {
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 200 },
    newPrice: { type: Number, min: 0 },
    status: { type: String, enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN', index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true, collection: 'listing_reports' }
);
// Mỗi người chỉ có 1 báo lỗi đang mở cho mỗi căn — gửi lại là cập nhật lý do
listingReportSchema.index({ apartmentId: 1, reporterId: 1 }, { unique: true, partialFilterExpression: { status: 'OPEN' } });

export const ListingReport = model<IListingReport>('ListingReport', listingReportSchema);
