import { Types } from 'mongoose';
import { ListingReport, ReportReason } from './listing-report.model.js';
import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { User } from '../auth/user.model.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';

// Story 13.6 / 14.6 — mọi lối đóng báo lỗi dùng chung các quy tắc dưới đây
export const TRUST_STEP = 5;
const TRUST_LOCK_BELOW = -15;
const FLAG_THRESHOLD = 2; // Số người KHÁC NHAU (không tính người tạo căn) cần báo để gắn "Chờ xác minh"

const REASON_LABEL: Record<ReportReason, string> = {
  RENTED: 'Đã cho thuê',
  PRICE_CHANGED: 'Chủ tăng giá',
  UNREACHABLE: 'Không liên lạc được chủ',
  WRONG_PHOTOS: 'Ảnh không đúng',
};

// "Đã cho thuê (2), Chủ tăng giá (1)" — xếp lý do nhiều người báo nhất lên đầu
const summarize = (reasons: ReportReason[]) => {
  const counts = new Map<ReportReason, number>();
  reasons.forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${REASON_LABEL[reason]} (${n})`);
};

/**
 * Đóng báo lỗi đang mở của 1 căn. `reasons`: chỉ đóng các lý do này (không truyền = tất cả).
 * `trustDelta`: cộng / trừ điểm tín nhiệm người báo (trừ chính người xử lý); điểm < −15 → khóa quyền báo lỗi.
 * Trả về số người báo được tính điểm.
 */
export async function closeOpenReports(
  apartmentId: unknown,
  actorId: string,
  status: 'RESOLVED' | 'DISMISSED',
  { reasons, trustDelta = 0 }: { reasons?: ReportReason[]; trustDelta?: number } = {}
): Promise<number> {
  const filter = { apartmentId, status: 'OPEN', ...(reasons && { reason: { $in: reasons } }) };
  const open = await ListingReport.find(filter).select('reporterId').lean();
  if (!open.length) return 0;
  await ListingReport.updateMany(filter, { $set: { status, resolvedBy: actorId, resolvedAt: new Date() } });

  const others = [...new Set(open.map((report) => String(report.reporterId)))].filter((id) => id !== actorId);
  if (trustDelta && others.length) {
    await User.updateMany({ _id: { $in: others } }, { $inc: { trustScore: trustDelta } });
    if (trustDelta < 0) await User.updateMany({ _id: { $in: others }, trustScore: { $lt: TRUST_LOCK_BELOW } }, { $set: { canReport: false } });
  }
  return others.length;
}

type FlaggableApartment = Pick<IApartment, 'title' | 'status' | 'price' | 'priceUsd' | 'verification'> & { _id: Types.ObjectId; managerId: Types.ObjectId };

/**
 * Tính lại nhãn "Chờ xác minh" theo báo lỗi còn mở (≥ 2 người khác người tạo căn). Ghi DB, phát real-time khi nhãn bật / tắt.
 * Trả về nhãn mới và `firstFlag` (vừa đủ ngưỡng lần đầu → nơi gọi báo Quản lý).
 */
export async function refreshVerification(apartment: FlaggableApartment) {
  const open = await ListingReport.find({ apartmentId: apartment._id, status: 'OPEN', reporterId: { $ne: apartment.managerId } }).select('reason').lean();
  const flagged = open.length >= FLAG_THRESHOLD;
  const verification = flagged ? { flaggedAt: apartment.verification?.flaggedAt ?? new Date(), reasons: summarize(open.map((report) => report.reason)) } : undefined;
  await Apartment.updateOne({ _id: apartment._id }, verification ? { $set: { verification } } : { $unset: { verification: 1 } });
  const { _id, title, status, price, priceUsd } = apartment;
  if (Boolean(apartment.verification) !== flagged) publishApartmentEvent('apartment.flagged', { _id, title, status, price, priceUsd, verification });
  return { verification, firstFlag: flagged && !apartment.verification };
}
