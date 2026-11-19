import { Types } from 'mongoose';
import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import { User } from '../auth/user.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { ListingReport, ReportReason } from './listing-report.model.js';
import { closeOpenReports } from './report-closing.js';
import { CreateReportInput, ResolveReportInput } from './listing-report.validation.js';

export const REASON_LABEL: Record<ReportReason, string> = {
  RENTED: 'Đã cho thuê',
  PRICE_CHANGED: 'Chủ tăng giá',
  UNREACHABLE: 'Không liên lạc được chủ',
  WRONG_PHOTOS: 'Ảnh không đúng',
};
const FLAG_THRESHOLD = 2; // Số người KHÁC NHAU (không tính Quản lý của căn) cần báo để gắn "Chờ xác minh"
const TRUST_STEP = 5;
const TRUST_LOCK_BELOW = -15;
const NOT_FOUND = { status: 404, message: 'Không tìm thấy căn hộ' };

const canResolve = (apartment: Pick<IApartment, 'managerId'>, actor: { id: string; role: string }) =>
  actor.role === 'ADMIN' || String(apartment.managerId) === actor.id;

// "Đã cho thuê (2), Chủ tăng giá (1)" — xếp lý do nhiều người báo nhất lên đầu
const summarize = (reasons: ReportReason[]) => {
  const counts = new Map<ReportReason, number>();
  reasons.forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${REASON_LABEL[reason]} (${n})`);
};

export class ListingReportService {
  /** CTV / Quản lý báo lỗi 1 căn đang chào. Mỗi người 1 báo lỗi đang mở / căn — gửi lại là cập nhật lý do. */
  static async report(apartmentId: string, actor: { id: string }, input: CreateReportInput) {
    const [apartment, user] = await Promise.all([Apartment.findById(apartmentId), User.findById(actor.id).select('canReport').lean()]);
    if (!apartment) throw NOT_FOUND;
    if (apartment.status !== 'AVAILABLE' && apartment.status !== 'UPCOMING') throw { status: 400, message: 'Chỉ báo lỗi căn đang Trống hoặc Sắp trống' };
    // Tài khoản cũ chưa có trường canReport (đọc .lean() không điền mặc định) → chỉ chặn khi bị khóa rõ ràng
    if (!user || user.canReport === false) throw { status: 403, message: 'Quyền báo lỗi của bạn đang bị khóa, vui lòng liên hệ Admin' };

    const fields = { reason: input.reason, note: input.note || '' };
    const update =
      input.reason === 'PRICE_CHANGED' && input.newPrice ? { $set: { ...fields, newPrice: input.newPrice } } : { $set: fields, $unset: { newPrice: 1 } };
    await ListingReport.findOneAndUpdate({ apartmentId: apartment._id, reporterId: actor.id, status: 'OPEN' }, update, { upsert: true, setDefaultsOnInsert: true }).catch((err) => {
      if (err.code !== 11000) throw err; // Bấm 2 lần cùng lúc: lần kia đã tạo báo lỗi → bỏ qua
    });
    await this.refreshFlag(apartment);
  }

  /** Đủ ngưỡng → gắn "Chờ xác minh", báo Quản lý của căn 1 lần, phát real-time để thẻ trên máy CTV khác đổi ngay. */
  private static async refreshFlag(apartment: IApartment) {
    const open = await ListingReport.find({ apartmentId: apartment._id, status: 'OPEN', reporterId: { $ne: apartment.managerId } }).select('reason').lean();
    if (open.length < FLAG_THRESHOLD) return;
    const firstFlag = !apartment.verification;
    const verification = { flaggedAt: apartment.verification?.flaggedAt ?? new Date(), reasons: summarize(open.map((report) => report.reason)) };
    await Apartment.updateOne({ _id: apartment._id }, { $set: { verification } });
    if (!firstFlag) return;
    publishApartmentEvent('apartment.flagged', { ...apartment.toObject(), verification });
    NotificationService.notify({
      userId: String(apartment.managerId),
      type: 'LISTING_FLAGGED',
      title: 'Căn bị CTV báo lỗi, cần xác minh',
      body: `${apartment.title}: ${verification.reasons.join(', ')}`,
      apartmentId: String(apartment._id),
    }).catch(() => undefined); // Lỗi gửi thông báo không làm hỏng việc báo lỗi
  }

  // Báo lỗi đang mở của 1 căn (mục "Báo lỗi" trong chi tiết căn — Quản lý)
  static async listForApartment(apartmentId: string) {
    return ListingReport.find({ apartmentId, status: 'OPEN' }).sort({ createdAt: -1 }).populate('reporterId', 'name ctvCode trustScore').lean();
  }

  /** Hàng đợi kiểm duyệt (Admin + Quản lý): căn có báo lỗi đang mở, mới nhất trước. `canResolve` = Admin hoặc Quản lý của căn. */
  static async queue(actor: { id: string; role: string }) {
    const groups = await ListingReport.aggregate<{ _id: Types.ObjectId; lastAt: Date }>([
      { $match: { status: 'OPEN' } },
      { $group: { _id: '$apartmentId', lastAt: { $max: '$updatedAt' } } },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);
    const ids = groups.map((group) => group._id);
    const [apartments, reports] = await Promise.all([
      Apartment.find({ _id: { $in: ids } }).select('title images price status managerId verification').lean(),
      ListingReport.find({ apartmentId: { $in: ids }, status: 'OPEN' }).sort({ createdAt: -1 }).populate('reporterId', 'name ctvCode trustScore').lean(),
    ]);
    const byId = new Map(apartments.map((apartment) => [String(apartment._id), apartment]));
    return ids.flatMap((id) => {
      const apartment = byId.get(String(id));
      if (!apartment) return []; // Căn đã bị xóa
      const { managerId, images, ...rest } = apartment;
      return [{ ...rest, image: images?.[0], canResolve: canResolve({ managerId }, actor), reports: reports.filter((report) => String(report.apartmentId) === String(id)) }];
    });
  }

  /**
   * Xử lý báo lỗi (Story 13.6). Đã thuê / sửa giá đi qua ApartmentService (phát real-time, ghi nhật ký, tự đóng báo lỗi)
   * và cộng điểm tín nhiệm người báo. "Tin vẫn đúng" gỡ cờ; đánh dấu báo sai thì trừ điểm, dưới −15 tự khóa quyền báo.
   */
  static async resolve(apartmentId: string, actor: AuditActor, input: ResolveReportInput) {
    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) throw NOT_FOUND;
    if (!canResolve(apartment, actor)) throw { status: 403, message: 'Chỉ Admin hoặc Quản lý của căn được xử lý báo lỗi' };
    const reporters = (await ListingReport.find({ apartmentId, status: 'OPEN' }).select('reporterId').lean()).map((report) => report.reporterId);
    if (!reporters.length) throw { status: 409, message: 'Báo lỗi của căn này đã được xử lý' };

    if (input.action === 'MARK_RENTED') await ApartmentService.updateStatus(apartmentId, { status: 'RENTED' }, actor);
    else if (input.action === 'UPDATE_PRICE') await ApartmentService.update(apartmentId, { price: input.price }, actor);
    else {
      await closeOpenReports(apartment._id, actor.id, 'DISMISSED');
      if (apartment.verification) {
        await Apartment.updateOne({ _id: apartment._id }, { $unset: { verification: 1 } });
        publishApartmentEvent('apartment.flagged', { ...apartment.toObject(), verification: undefined });
      }
      AuditService.log(actor, 'DISMISS_REPORT', { type: 'APARTMENT', id: apartment._id, title: apartment.title }, { reporters: reporters.length, wrongReport: input.wrongReport });
    }

    // Điểm tín nhiệm chỉ tính cho người báo khác người đang xử lý
    const others = reporters.filter((id) => String(id) !== actor.id);
    const delta = input.action === 'DISMISS' ? (input.wrongReport ? -TRUST_STEP : 0) : TRUST_STEP;
    if (delta && others.length) {
      await User.updateMany({ _id: { $in: others } }, { $inc: { trustScore: delta } });
      if (delta < 0) await User.updateMany({ _id: { $in: others }, trustScore: { $lt: TRUST_LOCK_BELOW } }, { $set: { canReport: false } });
    }
    return { reporters: others.length, trustDelta: others.length ? delta : 0 };
  }
}
