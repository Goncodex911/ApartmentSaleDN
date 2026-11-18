/**
 * Link ảnh cỡ vừa để gửi khách (Story 10.3): cạnh dài tối đa 1600px, chất lượng tự động, JPG — Cloudinary tự xử lý qua link.
 * Ảnh không nằm trên Cloudinary → giữ nguyên link.
 */
export const downloadSizeUrl = (url: string) =>
  url.includes('res.cloudinary.com') && url.includes('/image/upload/') ? url.replace('/image/upload/', '/image/upload/c_limit,w_1600,q_auto,f_jpg/') : url;
