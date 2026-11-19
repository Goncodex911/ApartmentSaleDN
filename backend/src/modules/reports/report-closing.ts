import { Types } from 'mongoose';
import { ListingReport } from './listing-report.model.js';

/**
 * Đóng mọi báo lỗi đang mở của 1 căn (Story 13.6). Gọi khi Quản lý đổi trạng thái Đã cọc / Đã thuê, lưu form sửa căn,
 * hoặc xử lý trong hàng đợi. Trả về người đã báo (để cộng / trừ điểm tín nhiệm khi xử lý trong hàng đợi).
 */
export async function closeOpenReports(apartmentId: unknown, userId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<Types.ObjectId[]> {
  const open = await ListingReport.find({ apartmentId, status: 'OPEN' }).select('reporterId').lean();
  if (!open.length) return [];
  await ListingReport.updateMany({ apartmentId, status: 'OPEN' }, { $set: { status, resolvedBy: userId, resolvedAt: new Date() } });
  return open.map((report) => report.reporterId);
}
