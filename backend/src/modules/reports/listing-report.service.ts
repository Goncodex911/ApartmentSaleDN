import { Types } from 'mongoose';
import { Apartment, IApartment } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import { User } from '../auth/user.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { ListingReport } from './listing-report.model.js';
import { closeOpenReports, refreshVerification, TRUST_STEP } from './report-closing.js';
import { CreateReportInput, ResolveReportInput } from './listing-report.validation.js';

const NOT_FOUND = { status: 404, message: 'Không tìm thấy căn hộ' };

export class ListingReportService {
  /** CTV / Quản lý báo lỗi 1 căn đang chào. Mỗi người 1 báo lỗi đang mở / căn — gửi lại là cập nhật lý do. */
  static async report(apartmentId: string, actor: AuditActor, input: CreateReportInput) {
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
    AuditService.log(actor, 'CREATE_REPORT', { type: 'APARTMENT', id: apartment._id, title: apartment.title }, { reason: input.reason }); // Story 16.2
  }

  /** Đủ ngưỡng → gắn "Chờ xác minh" (phát real-time), lần đầu thì báo cả đội Quản lý (Story 14.3). */
  private static async refreshFlag(apartment: IApartment) {
    const { verification, firstFlag } = await refreshVerification(apartment);
    if (!firstFlag || !verification) return;
    NotificationService.notifyManagers({
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

  /**
   * Hàng đợi kiểm duyệt (Admin + Quản lý): căn có báo lỗi đang mở, mới nhất trước. `canResolve` luôn true: chung kho (Story 14.3), giữ cho frontend cũ.
   * Story 14.6: bỏ căn đã xóa TRƯỚC khi cắt 100 nhóm → báo lỗi mồ côi không chiếm chỗ.
   */
  static async queue() {
    const groups = await ListingReport.aggregate<{ _id: Types.ObjectId; lastAt: Date }>([
      { $match: { status: 'OPEN' } },
      { $group: { _id: '$apartmentId', lastAt: { $max: '$updatedAt' } } },
      { $lookup: { from: Apartment.collection.name, localField: '_id', foreignField: '_id', as: 'apartment', pipeline: [{ $project: { _id: 1 } }] } },
      { $match: { 'apartment.0': { $exists: true } } },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);
    const ids = groups.map((group) => group._id);
    const [apartments, reports] = await Promise.all([
      Apartment.find({ _id: { $in: ids } }).select('title images price status verification').lean(),
      ListingReport.find({ apartmentId: { $in: ids }, status: 'OPEN' }).sort({ createdAt: -1 }).populate('reporterId', 'name ctvCode trustScore').lean(),
    ]);
    const byId = new Map(apartments.map((apartment) => [String(apartment._id), apartment]));
    return ids.flatMap((id) => {
      const apartment = byId.get(String(id));
      if (!apartment) return []; // Căn vừa bị xóa giữa 2 lần đọc
      const { images, ...rest } = apartment;
      return [{ ...rest, image: images?.[0], canResolve: true, reports: reports.filter((report) => String(report.apartmentId) === String(id)) }];
    });
  }

  /**
   * Xử lý báo lỗi trong hàng đợi (Story 13.6 / 14.6). Điểm tín nhiệm tính trong closeOpenReports (dùng chung mọi lối xử lý):
   * - Đã thuê: đi qua updateStatus (đóng tất cả, +5).
   * - Sửa giá: đi qua update (đóng "Chủ tăng giá", +5) rồi đóng nốt các báo lỗi còn lại của căn (+5) — Quản lý đã xử lý cả mục.
   * - Tin vẫn đúng: đóng DISMISSED; "báo sai" thì −5, dưới −15 tự khóa quyền báo.
   */
  static async resolve(apartmentId: string, actor: AuditActor, input: ResolveReportInput) {
    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) throw NOT_FOUND;
    const reporters = (await ListingReport.find({ apartmentId, status: 'OPEN' }).select('reporterId').lean()).map((report) => String(report.reporterId));
    if (!reporters.length) throw { status: 409, message: 'Báo lỗi của căn này đã được xử lý' };

    if (input.action === 'MARK_RENTED') {
      await ApartmentService.updateStatus(apartmentId, { status: 'RENTED' }, actor);
    } else if (input.action === 'UPDATE_PRICE') {
      await ApartmentService.update(apartmentId, { price: input.price }, actor);
      await closeOpenReports(apartment._id, actor.id, 'RESOLVED', { trustDelta: TRUST_STEP });
      const updated = await Apartment.findById(apartmentId);
      if (updated) await refreshVerification(updated);
    } else {
      await closeOpenReports(apartment._id, actor.id, 'DISMISSED', { trustDelta: input.wrongReport ? -TRUST_STEP : 0 });
      await refreshVerification(apartment);
      AuditService.log(actor, 'DISMISS_REPORT', { type: 'APARTMENT', id: apartment._id, title: apartment.title }, { reporters: reporters.length, wrongReport: input.wrongReport });
    }

    if (input.action !== 'DISMISS') AuditService.log(actor, 'RESOLVE_REPORT', { type: 'APARTMENT', id: apartment._id, title: apartment.title }, { action: input.action, reporters: reporters.length });
    // Phản hồi cho màn hình hàng đợi: số người báo được tính điểm (không tính người đang xử lý) và mức điểm
    const others = reporters.filter((id) => id !== actor.id).length;
    const delta = input.action === 'DISMISS' ? (input.wrongReport ? -TRUST_STEP : 0) : TRUST_STEP;
    return { reporters: others, trustDelta: others ? delta : 0 };
  }
}
