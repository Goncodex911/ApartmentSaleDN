import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { Apartment } from './apartment.model.js';
import { ANY_DELETION_STATE } from './soft-delete.js';
import { ApartmentService } from './apartment.service.js';
import { ListingSubmission } from '../submissions/submission.model.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { deleteCloudinaryMedia } from '../../config/cloudinary.js';
import { ZONES } from './listing-taxonomy.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRASH_RETENTION_DAYS = 30; // Q3
const PURGE_BATCH = 50; // Mỗi lần dọn tối đa 50 căn → không treo request mở app
const DELETED = { deletedAt: { $ne: null } }; // Có deletedAt ở bộ lọc → middleware xóa mềm không tự lọc (xem soft-delete.ts)
const NOT_FOUND = { status: 404, message: 'Không tìm thấy căn trong Thùng rác' };
const target = (apartment: { _id: unknown; title: string }) => ({ type: 'APARTMENT' as const, id: apartment._id, title: apartment.title });

export const pageQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30) });
export const staleQuerySchema = pageQuerySchema.extend({
  days: z.coerce.number().refine((value) => [30, 60, 90].includes(value), 'Chỉ nhận 30, 60 hoặc 90 ngày').default(30),
  zone: z.enum(ZONES).optional(),
  managerId: z.string().refine(isValidObjectId, 'Người tạo không hợp lệ').optional(),
});
export const bulkStaleSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('UPCOMING'), ids: z.array(z.string().refine(isValidObjectId)).min(1).max(100), availableDate: z.iso.datetime() }),
  z.object({ action: z.enum(['NEEDS_REVIEW', 'DELETE']), ids: z.array(z.string().refine(isValidObjectId)).min(1).max(100) }),
]);

// Link Cloudinary của hệ thống → { loại, public_id }; link ngoài (ảnh cào từ nhóm chat) → null, không đụng tới
function parseOwnMedia(url: string): { type: 'image' | 'video'; id: string } | null {
  const match = url.match(/\/(image|video)\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
  return match && match[2].startsWith('apartment_sale/') ? { type: match[1].toLowerCase() as 'image' | 'video', id: match[2] } : null;
}

/** [ADMIN] Story 16.7: Thùng rác (khôi phục / xóa vĩnh viễn, tự dọn sau 30 ngày) + Kho tồn (căn lâu không cập nhật). */
export class TrashService {
  static async listTrash({ page, limit }: z.infer<typeof pageQuerySchema>) {
    const [items, total] = await Promise.all([
      Apartment.find(DELETED).select('title price status location.zone location.district images deletedAt deletedBy').sort({ deletedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('deletedBy', 'name').lean(),
      Apartment.countDocuments(DELETED),
    ]);
    const now = Date.now();
    const withDaysLeft = items.map((item) => ({ ...item, daysLeft: Math.max(0, TRASH_RETENTION_DAYS - Math.floor((now - new Date(item.deletedAt!).getTime()) / DAY_MS)) }));
    return { items: withDaysLeft, total, page, limit };
  }

  /** Khôi phục về đúng trạng thái trước khi xóa (xóa mềm không đổi status). Báo lỗi cũ KHÔNG mở lại. */
  static async restore(actor: AuditActor, id: string) {
    if (!isValidObjectId(id)) throw NOT_FOUND;
    const apartment = await Apartment.findOneAndUpdate({ _id: id, ...DELETED }, { $unset: { deletedAt: 1, deletedBy: 1 } }, { new: true, timestamps: false }).lean();
    if (!apartment) throw NOT_FOUND;
    AuditService.log(actor, 'RESTORE_APARTMENT', target(apartment));
    return apartment;
  }

  /** Xóa vĩnh viễn + dọn ảnh / video Cloudinary của hệ thống mà không căn / tin nào khác còn dùng. */
  static async purge(actor: AuditActor | undefined, id: string) {
    if (!isValidObjectId(id)) throw NOT_FOUND;
    const apartment = await Apartment.findOne({ _id: id, ...DELETED }).select('title images videos').lean();
    if (!apartment) throw NOT_FOUND;
    const urls = [...(apartment.images || []), ...(apartment.videos || [])];
    if (urls.length && process.env.CLOUDINARY_API_KEY) {
      const [others, submissions] = await Promise.all([
        Apartment.find({ _id: { $ne: id }, deletedAt: ANY_DELETION_STATE, $or: [{ images: { $in: urls } }, { videos: { $in: urls } }] }).select('images videos').lean(),
        ListingSubmission.find({ $or: [{ 'data.images': { $in: urls } }, { 'data.videos': { $in: urls } }] }).select('data.images data.videos').lean(),
      ]);
      const inUse = new Set([...others.flatMap((a) => [...a.images, ...(a.videos || [])]), ...submissions.flatMap((s) => [...(s.data.images || []), ...(s.data.videos || [])])]);
      const media = urls.filter((url) => !inUse.has(url)).map(parseOwnMedia).filter((item) => item !== null);
      await deleteCloudinaryMedia(media.filter((m) => m.type === 'image').map((m) => m.id), 'image');
      await deleteCloudinaryMedia(media.filter((m) => m.type === 'video').map((m) => m.id), 'video');
    }
    await Apartment.deleteOne({ _id: id, ...DELETED });
    // Dọn tự động (không có người thực hiện) không ghi nhật ký — chỉ Admin bấm tay mới ghi
    if (actor) AuditService.log(actor, 'PURGE_APARTMENT', target(apartment));
  }

  /** Việc hằng ngày: xóa vĩnh viễn căn ở Thùng rác quá 30 ngày (tối đa 50 căn / lần). */
  static async purgeExpired(now = new Date()) {
    const expired = await Apartment.find({ deletedAt: { $lt: new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS) } }).select('_id').limit(PURGE_BATCH).lean();
    for (const { _id } of expired) await this.purge(undefined, String(_id));
    return expired.length;
  }

  /** Căn đang chào (Trống / Sắp trống) không cập nhật quá N ngày — cũ nhất trước. */
  static async listStale({ days, zone, managerId, page, limit }: z.infer<typeof staleQuerySchema>) {
    const filter = {
      status: { $in: ['AVAILABLE', 'UPCOMING'] },
      updatedAt: { $lt: new Date(Date.now() - days * DAY_MS) },
      ...(zone && { 'location.zone': zone }),
      ...(managerId && { managerId }),
    };
    const [items, total] = await Promise.all([
      Apartment.find(filter).select('title price status location.zone location.district updatedAt managerId needsReview').sort({ updatedAt: 1 }).skip((page - 1) * limit).limit(limit).populate('managerId', 'name').lean(),
      Apartment.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /** Thao tác hàng loạt (≤ 100 căn) — đi qua service sẵn có để giữ realtime / ghép khách / nhật ký từng căn. */
  static async bulkStale(actor: AuditActor, input: z.infer<typeof bulkStaleSchema>) {
    let done = 0;
    for (const id of input.ids) {
      try {
        if (input.action === 'DELETE') await ApartmentService.delete(id, actor, true);
        else if (input.action === 'UPCOMING') await ApartmentService.updateStatus(id, { status: 'UPCOMING', availableDate: input.availableDate }, actor);
        else {
          const apartment = await Apartment.findOneAndUpdate({ _id: id, needsReview: { $ne: true } }, { $set: { needsReview: true, reviewReason: 'Kho tồn: lâu không cập nhật' } }).select('title').lean();
          if (apartment) AuditService.log(actor, 'UPDATE_APARTMENT', target(apartment), { changes: { needsReview: { from: false, to: true } }, bulk: true });
        }
        done++;
      } catch {
        // Căn vừa bị người khác xóa / đổi → bỏ qua, báo số căn đã xử lý
      }
    }
    return { done, total: input.ids.length };
  }
}
