/**
 * Link ảnh cỡ vừa để gửi khách (Story 10.3): cạnh dài tối đa 1600px, chất lượng tự động, JPG — Cloudinary tự xử lý qua link.
 * Ảnh không nằm trên Cloudinary → giữ nguyên link.
 */
export const downloadSizeUrl = (url: string) =>
  url.includes('res.cloudinary.com') && url.includes('/image/upload/') ? url.replace('/image/upload/', '/image/upload/c_limit,w_1600,q_auto,f_jpg/') : url;

// Đổi đoạn biến đổi Cloudinary (ảnh ngoài Cloudinary giữ nguyên link)
const withTransform = (url: string, transform: string) =>
  url.includes('res.cloudinary.com') && url.includes('/image/upload/') ? url.replace('/image/upload/', `/image/upload/${transform}/`) : url;

/** Ảnh thẻ căn (Story 12.2): cắt 4:3, rộng 640px, tự chọn định dạng / chất lượng — tiết kiệm 4G. */
export const cardSizeUrl = (url: string) => withTransform(url, 'c_fill,w_640,h_480,q_auto,f_auto');

/** Ảnh nhỏ dải xem nhanh (Story 12.4). */
export const thumbSizeUrl = (url: string) => withTransform(url, 'c_fill,w_160,h_120,q_auto,f_auto');
