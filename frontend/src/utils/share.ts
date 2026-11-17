import { isTouchDevice } from './device.js';

/** Có khay chia sẻ của hệ điều hành (điện thoại) — máy tính hiện khay chia sẻ của Windows / macOS không tiện, dùng copy. */
export const canNativeShare = () => typeof navigator.share === 'function' && isTouchDevice();

/**
 * Mở khay chia sẻ (Zalo, Messenger...) với nội dung chữ — Story 9.4.
 * Trả về: 'shared' | 'cancelled' (người dùng tự đóng khay) | 'unsupported' / 'failed' (bên gọi chuyển sang copy).
 * Link được gộp sẵn vào nội dung chữ: Zalo trên iPhone thường chỉ nhận 1 trong 2 phần "text" hoặc "url".
 */
export async function nativeShare(text: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  if (!canNativeShare()) return 'unsupported';
  try {
    await navigator.share({ text });
    return 'shared';
  } catch (err) {
    return (err as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
