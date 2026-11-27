import { Apartment } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { GeminiService } from '../ingestion/gemini.service.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { createMasterApartment, downloadImages } from './create-master.js';
import { POSSIBLE_SAME_UNIT_REASON } from './dedup.service.js';

const findOr404 = async (id: string) => {
  const apartment = await Apartment.findById(id);
  if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
  return apartment;
};

/**
 * Story 20.2: người dán tin sửa lại quyết định gộp của AI (chỉ Quản lý / Admin — cùng quyền với Nhập tin AI).
 */
export class MergeActionsService {
  /** Gộp nhầm → tách nguồn phụ thành căn mới. Tạo căn TRƯỚC rồi mới gỡ nguồn: lỗi giữa chừng không làm mất tin. */
  static async split(masterId: string, subListingId: string, actor: AuditActor) {
    const master = await findOr404(masterId);
    const index = master.subListings.findIndex((sub) => String(sub._id) === subListingId);
    // Nguồn 0 là tin tạo ra căn này — không tách được
    if (index < 1) throw { status: 404, message: 'Không tìm thấy nguồn đã gộp trong căn này' };
    const sub = master.subListings[index];

    const parsed = await GeminiService.parseRealEstatePost(sub.rawContent || '');
    if (!parsed.isRentalListing || !parsed.extracted) throw { status: 422, message: 'AI không đọc được tin gốc để tạo căn mới' };

    const mediaUrls = sub.images || [];
    const { imageHashes, downloadedImages } = await downloadImages(mediaUrls);
    const input = { sourceType: sub.sourceType, sourceName: sub.sourceName, sourceUrl: sub.sourceUrl, rawText: sub.rawContent!, managerId: actor.id };
    const apartment = await createMasterApartment(input, { ext: parsed.extracted, mediaUrls, imageHashes, downloadedImages, review: {} });

    master.subListings.splice(index, 1);
    await master.save();
    AuditService.log(actor, 'AI_IMPORT', { type: 'APARTMENT', id: apartment._id, title: apartment.title }, { split: true, fromMasterId: masterId });
    return { _id: apartment._id, title: apartment.title };
  }

  /** Căn "có thể trùng" là căn riêng → bỏ cờ cần kiểm tra (chỉ khi cờ đó do luật có-thể-trùng gắn). */
  static async keepSeparate(apartmentId: string, actor: AuditActor) {
    const result = await Apartment.updateOne(
      { _id: apartmentId, reviewReason: new RegExp(`^${escapeRegex(POSSIBLE_SAME_UNIT_REASON)}`) },
      { $set: { needsReview: false }, $unset: { reviewReason: 1 } }
    );
    if (!result.matchedCount) throw { status: 404, message: 'Căn không còn ở trạng thái "có thể trùng"' };
    AuditService.log(actor, 'AI_IMPORT', { type: 'APARTMENT', id: apartmentId }, { keptSeparate: true });
  }

  /** Căn "có thể trùng" đúng là căn cũ → chuyển các nguồn sang căn cũ, căn vừa tạo vào Thùng rác (khôi phục được 30 ngày). */
  static async mergeInto(apartmentId: string, targetId: string, actor: AuditActor) {
    if (apartmentId === targetId) throw { status: 400, message: 'Không thể gộp căn vào chính nó' };
    const [apartment, target] = await Promise.all([findOr404(apartmentId), findOr404(targetId)]);
    target.subListings.push(...apartment.toObject().subListings.map(({ _id, ...sub }) => sub));
    target.updatedAt = new Date();
    await target.save();
    await ApartmentService.delete(apartmentId, actor);
    AuditService.log(actor, 'AI_IMPORT', { type: 'APARTMENT', id: target._id, title: target.title }, { mergedFrom: apartmentId });
    return { _id: target._id, title: target.title };
  }
}
