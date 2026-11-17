// Tên cache trùng với runtimeCaching trong vite.config.ts (Story 9.1)
const API_CACHE = 'api-apartments';

/**
 * Xóa dữ liệu Bảng hàng lưu offline. Gọi khi đăng xuất và khi đăng nhập:
 * cache lưu theo địa chỉ request, không theo tài khoản → không xóa thì người đăng nhập sau (VD CTV)
 * có thể thấy dữ liệu của người trước (VD Quản lý — có SĐT chủ nhà) khi mất mạng.
 */
export const clearOfflineData = async () => {
  if ('caches' in window) await caches.delete(API_CACHE).catch(() => false);
};

/** Ảnh Cloudinary trả header CORS → tải kiểu "anonymous" để Service Worker lưu được (không bị tính dung lượng "opaque"). */
export const imageCors = (url?: string) => (url?.startsWith('https://res.cloudinary.com/') ? ('anonymous' as const) : undefined);
