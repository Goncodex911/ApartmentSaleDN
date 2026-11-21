import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { copyText } from './clipboard.js';
import { generateZaloPost } from './zaloPostGenerator.js';
import { createWhatsAppShareUrl } from './whatsappFormatter.js';
import { downloadSizeUrl } from './cloudinaryImage.js';
import { isTouchDevice } from './device.js';

/**
 * Tải 1 ảnh về máy người dùng
 */
async function downloadSinglePhoto(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(downloadSizeUrl(url));
    if (!res.ok) return;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    // Nếu bị CORS hoặc lỗi mạng, bỏ qua
  }
}

/**
 * Điều phối luồng chia sẻ 1-chạm lên Zalo (Story 17.1):
 * 1. Tự soạn bài viết tối ưu Zalo (có Spintax)
 * 2. Lưu bài vào Clipboard
 * 3. Tải sẵn 4 ảnh đẹp nhất về máy
 * 4. Kích hoạt deep-link mở ứng dụng Zalo (mobile) hoặc chat.zalo.me (desktop)
 */
export async function dispatchZaloShare(
  apartment: Apartment,
  ctv: User | null
): Promise<{ success: boolean; text: string; photosDownloaded: number }> {
  // 1. Soạn bài viết
  const text = generateZaloPost(apartment, ctv, { tone: 'deal' });

  // 2. Lưu vào Clipboard
  await copyText(text);

  // 3. Tải tối đa 4 ảnh đầu tiên (trừ ảnh bị ẩn)
  const allowedPhotos = (apartment.images || []).filter(
    (url) => !apartment.hiddenImages?.includes(url)
  ).slice(0, 4);

  let photosDownloaded = 0;
  if (allowedPhotos.length > 0) {
    // Tải song song 4 ảnh
    await Promise.all(
      allowedPhotos.map(async (url, idx) => {
        await downloadSinglePhoto(url, `can-ho-${apartment._id}-anh-${idx + 1}.jpg`);
        photosDownloaded++;
      })
    );
  }

  // 4. Kích hoạt mở Zalo
  const isMobile = isTouchDevice();
  if (isMobile) {
    // Thử mở ứng dụng Zalo qua URI Scheme
    window.location.href = 'zalo://';
    // Fallback sau 500ms nếu máy chưa cài Zalo app
    setTimeout(() => {
      window.open('https://zalo.me/share', '_blank');
    }, 600);
  } else {
    // Desktop: mở Zalo Web
    window.open('https://chat.zalo.me/', '_blank');
  }

  return { success: true, text, photosDownloaded };
}

/**
 * Điều phối chia sẻ 1-chạm qua WhatsApp (Story 17.1 & 17.3)
 */
export function dispatchWhatsAppShare(apartment: Apartment, ctv: User | null): void {
  const url = createWhatsAppShareUrl(apartment, ctv);
  window.open(url, '_blank');
}
