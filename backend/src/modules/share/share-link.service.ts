import { randomBytes } from 'node:crypto';
import { Apartment } from '../apartments/apartment.model.js';
import { User } from '../auth/user.model.js';
import { ShareLink } from './share-link.model.js';
import { slugify, toPublicListing } from './public-listing.util.js';

const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const SHARE_CODE_PATTERN = /^[a-z0-9]{8}$/;

// Mã link 8 ký tự ngẫu nhiên (~2.8 nghìn tỷ tổ hợp) — không đoán được để dò link của CTV khác
const generateCode = () => Array.from(randomBytes(8), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

export class ShareLinkService {
  /** Tìm hoặc tạo link duy nhất cho cặp (căn hộ, CTV). Upsert nguyên tử nên bấm 2 lần liên tiếp vẫn ra 1 link. */
  static async getOrCreateLink(apartmentId: string, ctvId: string) {
    const apartment = await Apartment.findById(apartmentId).select('title').lean();
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };

    const link = await ShareLink.findOneAndUpdate(
      { apartmentId, ctvId },
      { $setOnInsert: { code: generateCode() } },
      { upsert: true, new: true }
    ).lean();

    return {
      url: `${clientUrl()}/p/${slugify(apartment.title)}-${link.code}`,
      code: link.code,
      views: link.views,
      lastViewedAt: link.lastViewedAt,
    };
  }

  /** Dữ liệu trang xem phòng công khai + tăng lượt xem (bỏ qua khi chính CTV chủ link mở thử). */
  static async getPublicListing(code: string, viewerId?: string) {
    const link = await ShareLink.findOne({ code }).lean();
    if (!link) throw { status: 404, message: 'Link không còn hiệu lực' };

    const [apartment, ctv] = await Promise.all([
      Apartment.findById(link.apartmentId).lean(),
      User.findById(link.ctvId).select('name phone zaloPhone zaloLink avatarUrl greetingMessage status').lean(),
    ]);
    // CTV bị khóa/chưa được duyệt thì link cũng hết hiệu lực
    if (!apartment || !ctv || ctv.status !== 'ACTIVE') throw { status: 404, message: 'Link không còn hiệu lực' };

    if (viewerId !== String(link.ctvId)) {
      await ShareLink.updateOne({ _id: link._id }, { $inc: { views: 1 }, $set: { lastViewedAt: new Date() } });
    }

    return toPublicListing(apartment as any, ctv);
  }
}
