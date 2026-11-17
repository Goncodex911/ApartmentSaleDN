import { ListingSubmission, MAX_PENDING_PER_CTV } from './submission.model.js';
import { Apartment, isPrivilegedRole } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import type { SubmissionData } from './submission.validation.js';
import { districtOfZone } from '../apartments/listing-taxonomy.js';
import { DedupService } from '../dedup/dedup.service.js';
import { PHashUtil } from '../dedup/phash.util.js';
import { NotificationService } from '../notifications/notification.service.js';
import { User } from '../auth/user.model.js';
import { fetchImageBuffer } from '../../utils/fetch-image.js';

type Actor = { id: string; role: string };
type ListQuery = { status?: string; page: number; limit: number };

const NOT_FOUND = { status: 404, message: 'Không tìm thấy tin đăng' };
const ALREADY_HANDLED = { status: 409, message: 'Tin đã được xử lý, không thể thay đổi' };

// Mã pHash ảnh của tin (khử trùng lặp bằng ảnh như tin Telegram); ảnh lỗi bị bỏ qua
async function hashImages(urls: string[] = []): Promise<string[]> {
  const hashes = await Promise.all(urls.slice(0, 10).map((url) => fetchImageBuffer(url).then(PHashUtil.computeDHash).catch(() => null)));
  return hashes.filter((hash): hash is string => Boolean(hash));
}

const notifySafely = (task: Promise<unknown>) => task.catch(() => undefined); // Lỗi gửi thông báo không làm hỏng thao tác chính

async function page(filter: Record<string, unknown>, { page, limit }: ListQuery, withCtv = false) {
  const query = ListingSubmission.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  if (withCtv) query.populate('ctvId', 'name phone ctvCode');
  const [items, total] = await Promise.all([query.lean(), ListingSubmission.countDocuments(filter)]);
  return { items, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export class SubmissionService {
  /** CTV gửi tin vào hàng chờ duyệt (Story 8.6) — chưa vào kho căn hộ. */
  static async create(ctvId: string, data: SubmissionData) {
    const pending = await ListingSubmission.countDocuments({ ctvId, status: 'PENDING' });
    if (pending >= MAX_PENDING_PER_CTV) {
      throw { status: 429, message: `Bạn đang có ${MAX_PENDING_PER_CTV} tin chờ duyệt, vui lòng đợi Quản lý xử lý` };
    }
    const submission = await ListingSubmission.create({ ctvId, data });
    const ctv = await User.findById(ctvId).select('name').lean();
    notifySafely(
      NotificationService.notifyManagers({
        type: 'LISTING_SUBMITTED',
        title: 'Có tin mới chờ duyệt',
        body: `${data.title} — CTV ${ctv?.name || ''}`,
        submissionId: String(submission._id),
      })
    );
    return submission;
  }

  static listMine(ctvId: string, query: ListQuery) {
    return page({ ctvId, ...(query.status && { status: query.status }) }, query);
  }

  static list(query: ListQuery) {
    return page(query.status ? { status: query.status } : {}, query, true);
  }

  static pendingCount() {
    return ListingSubmission.countDocuments({ status: 'PENDING' });
  }

  /** Quản lý xem mọi tin; CTV chỉ xem tin của mình (tin người khác → 404, không lộ là có tồn tại). */
  static async getById(id: string, actor: Actor) {
    const submission = await ListingSubmission.findOne({ _id: id, ...this.ownerFilter(actor) }).populate('ctvId', 'name phone ctvCode').lean();
    if (!submission) throw NOT_FOUND;
    return submission;
  }

  /** Sửa khi còn Chờ duyệt: CTV sửa tin của mình, Quản lý sửa được mọi tin trước khi duyệt. */
  static async update(id: string, actor: Actor, data: SubmissionData) {
    const filter = { _id: id, ...this.ownerFilter(actor) };
    const updated = await ListingSubmission.findOneAndUpdate({ ...filter, status: 'PENDING' }, { $set: { data } }, { new: true });
    if (!updated) throw await this.notFoundOrHandled(filter);
    return updated;
  }

  /** CTV rút tin: chuyển "Đã rút", không xóa hẳn (còn lịch sử). */
  static async withdraw(id: string, ctvId: string) {
    const filter = { _id: id, ctvId };
    const updated = await ListingSubmission.findOneAndUpdate({ ...filter, status: 'PENDING' }, { $set: { status: 'WITHDRAWN' } }, { new: true });
    if (!updated) throw await this.notFoundOrHandled(filter);
    return updated;
  }

  /** Căn trong kho có thể trùng tin này: cùng SĐT chủ + tên đường + quận, hoặc trùng ảnh (giống luồng tin Telegram). */
  static async findDuplicates(id: string) {
    const submission = await ListingSubmission.findById(id).lean();
    if (!submission) throw NOT_FOUND;
    const { location, ownerContact, images } = submission.data;
    const district = (location.zone && districtOfZone(location.zone)) || location.district || '';
    const address = [location.houseNumber, location.street].filter(Boolean).join(' ') || location.address || '';

    const byContact = await DedupService.checkDeterministicMatch(ownerContact.phone, address, district);
    const byPhoto = byContact ? null : await DedupService.checkVisualMatch(await hashImages(images), district);
    const match = byContact || byPhoto?.matchedApartment;
    if (!match) return [];
    return [{ _id: match._id, title: match.title, price: match.price, address: match.location.address, reason: byContact ? 'Trùng SĐT chủ nhà và tên đường' : 'Trùng ảnh' }];
  }

  /**
   * Duyệt: tạo căn mới (đứng tên Quản lý duyệt, ghi nhận CTV đăng) hoặc gộp làm nguồn phụ vào căn đã có.
   * Chuyển trạng thái TRƯỚC (chỉ khi còn PENDING) → 2 Quản lý bấm cùng lúc chỉ 1 người thành công, không tạo 2 căn.
   */
  static async approve(id: string, manager: Actor, mergeInto?: string) {
    const claim = { status: 'APPROVED', reviewedBy: manager.id, reviewedAt: new Date() };
    const submission = await ListingSubmission.findOneAndUpdate({ _id: id, status: 'PENDING' }, { $set: claim }, { new: true });
    if (!submission) throw await this.notFoundOrHandled({ _id: id });

    try {
      const data = structuredClone(submission.data);
      const imageHashes = await hashImages(data.images);
      let apartmentId;
      if (mergeInto) {
        const master = await Apartment.findById(mergeInto);
        if (!master) throw { status: 404, message: 'Không tìm thấy căn để gộp' };
        const ctv = await User.findById(submission.ctvId).select('name').lean();
        await DedupService.aggregateSubListing(
          master,
          { sourceType: 'MANUAL', sourceName: `CTV ${ctv?.name || ''}`, rawText: data.description || data.title, mediaUrls: data.images, managerId: manager.id },
          { price: data.price, ownerContact: data.ownerContact },
          imageHashes
        );
        apartmentId = master._id;
      } else {
        // Căn mới duyệt từ tin CTV luôn ở trạng thái Trống; Quản lý đổi sau nếu cần
        const apartment = await ApartmentService.create({ ...data, status: 'AVAILABLE' }, manager.id, { submittedBy: String(submission.ctvId), imageHashes });
        apartmentId = apartment._id;
      }
      submission.set({ apartmentId, merged: Boolean(mergeInto) });
      await submission.save();
    } catch (err) {
      // Lỗi khi tạo / gộp căn → trả tin về Chờ duyệt để Quản lý thử lại
      await ListingSubmission.updateOne({ _id: id }, { $set: { status: 'PENDING' }, $unset: { reviewedBy: 1, reviewedAt: 1 } });
      throw err;
    }

    notifySafely(
      NotificationService.notify({
        userId: String(submission.ctvId),
        type: 'LISTING_APPROVED',
        title: 'Tin của bạn đã được duyệt',
        body: submission.data.title,
        submissionId: id,
        apartmentId: String(submission.apartmentId),
      })
    );
    return submission;
  }

  static async reject(id: string, manager: Actor, reason: string) {
    const update = { status: 'REJECTED', rejectReason: reason, reviewedBy: manager.id, reviewedAt: new Date() };
    const submission = await ListingSubmission.findOneAndUpdate({ _id: id, status: 'PENDING' }, { $set: update }, { new: true });
    if (!submission) throw await this.notFoundOrHandled({ _id: id });
    notifySafely(
      NotificationService.notify({
        userId: String(submission.ctvId),
        type: 'LISTING_REJECTED',
        title: 'Tin của bạn bị từ chối',
        body: `${submission.data.title}: ${reason}`,
        submissionId: id,
      })
    );
    return submission;
  }

  private static ownerFilter(actor: Actor) {
    return isPrivilegedRole(actor.role) ? {} : { ctvId: actor.id };
  }

  // Không đổi được trạng thái: tin không tồn tại (hoặc của người khác) → 404, còn lại là đã xử lý → 409
  private static async notFoundOrHandled(filter: Record<string, unknown>) {
    return (await ListingSubmission.exists(filter)) ? ALREADY_HANDLED : NOT_FOUND;
  }
}
