import { Apartment } from '../apartments/apartment.model.js';
import { User } from '../auth/user.model.js';
import { fetchImageBuffer } from '../../utils/fetch-image.js';
import { createZip } from '../../utils/zip.js';
import { addTextWatermark } from './watermark.util.js';

/** Ảnh được phép gửi khách = images − hiddenImages (ảnh dán SĐT nguồn cũ). */
export function getVisibleImages(apartment: { images?: string[]; hiddenImages?: string[] }): string[] {
  const hidden = new Set(apartment.hiddenImages || []);
  return (apartment.images || []).filter((url) => !hidden.has(url));
}

// Lấy danh sách ảnh hiển thị và chữ watermark (SĐT của chính CTV đang đăng nhập)
async function loadPhotoContext(apartmentId: string, userId: string) {
  const [apartment, user] = await Promise.all([
    Apartment.findById(apartmentId).select('images hiddenImages').lean(),
    User.findById(userId).select('phone zaloPhone').lean(),
  ]);
  if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
  if (!user) throw { status: 401, message: 'Tài khoản không tồn tại' };

  return {
    images: getVisibleImages(apartment),
    watermarkText: `Tel/Zalo: ${user.zaloPhone || user.phone}`,
  };
}

export class PhotoService {
  static async getWatermarkedPhoto(apartmentId: string, index: number, userId: string): Promise<Buffer> {
    const { images, watermarkText } = await loadPhotoContext(apartmentId, userId);
    const url = images[index];
    if (!url) throw { status: 404, message: 'Không tìm thấy ảnh' };
    return addTextWatermark(await fetchImageBuffer(url), watermarkText);
  }

  static async getWatermarkedZip(apartmentId: string, userId: string): Promise<Buffer> {
    const { images, watermarkText } = await loadPhotoContext(apartmentId, userId);
    if (images.length === 0) throw { status: 404, message: 'Căn hộ chưa có ảnh để tải' };

    // Ảnh nào lỗi thì bỏ qua, không làm hỏng cả file ZIP
    const results = await Promise.allSettled(
      images.map(async (url) => addTextWatermark(await fetchImageBuffer(url), watermarkText))
    );
    const entries = results.flatMap((result, i) =>
      result.status === 'fulfilled' ? [{ name: `anh-${i + 1}.jpg`, data: result.value }] : []
    );
    if (entries.length === 0) throw { status: 502, message: 'Không tải được ảnh nào của căn hộ, vui lòng thử lại' };

    return createZip(entries);
  }
}
