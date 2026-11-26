import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { ShareLinkInfo } from '../api/shareApi.js';
import { copyText } from './clipboard.js';
import { generateZaloPost } from './zaloPostGenerator.js';
import { buildWhatsAppExpatPost, whatsAppShareUrl } from './whatsappFormatter.js';
import { downloadSizeUrl } from './cloudinaryImage.js';
import { isTouchDevice } from './device.js';

/** Tải 1 ảnh về máy; true = tải được (lỗi mạng / CORS → false, không đếm) */
async function downloadSinglePhoto(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(downloadSizeUrl(url));
    if (!res.ok) return false;
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return true;
  } catch {
    return false;
  }
}

/** Zalo trên điện thoại: link zalo.me mở thẳng app nếu đã cài (universal link); máy tính: Zalo Web */
export const zaloOpenUrl = () => (isTouchDevice() ? 'https://zalo.me/' : 'https://chat.zalo.me/');

/**
 * Chia sẻ 1-chạm lên Zalo (Story 17.1, sửa ở Story 19.1):
 * 1. Soạn bài + sao chép NGAY trong thao tác bấm (link đã tạo sẵn khi mở menu → không chờ mạng, Safari không chặn)
 * 2. Tải tối đa 4 ảnh, đếm đúng số ảnh tải được
 * Mở Zalo do người dùng bấm nút "Mở Zalo" trên thông báo (cú bấm mới → trình duyệt không chặn popup).
 */
export async function dispatchZaloShare(apartment: Apartment, ctv: User | null, link: ShareLinkInfo) {
  const text = generateZaloPost(apartment, ctv, link.url, 'deal');
  const copied = copyText(text);
  const photos = (apartment.images || []).filter((url) => !apartment.hiddenImages?.includes(url)).slice(0, 4);
  const results = await Promise.all(photos.map((url, idx) => downloadSinglePhoto(url, `can-ho-${apartment._id}-anh-${idx + 1}.jpg`)));
  await copied;
  return { photosDownloaded: results.filter(Boolean).length, photosTotal: photos.length };
}

/** Chia sẻ 1-chạm qua WhatsApp (Story 17.1 & 17.3) — gọi trong thao tác bấm, link đã có sẵn */
export function dispatchWhatsAppShare(apartment: Apartment, ctv: User | null, link: ShareLinkInfo): void {
  window.open(whatsAppShareUrl(buildWhatsAppExpatPost(apartment, ctv, link)), '_blank', 'noopener');
}
