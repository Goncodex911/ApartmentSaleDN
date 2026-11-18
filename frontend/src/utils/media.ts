// Story 10.2: phân biệt ảnh / video theo link (căn cũ từng lưu video lẫn vào danh sách ảnh)
export const isVideoUrl = (url: string) => url.includes('/video/upload/') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);

/** Ảnh và video của căn: video trong `images` (dữ liệu cũ) được chuyển sang `videos` khi hiển thị. */
export const splitMedia = (item: { images?: string[]; videos?: string[] }) => {
  const images = item.images || [];
  return {
    images: images.filter((url) => !isVideoUrl(url)),
    videos: [...(item.videos || []), ...images.filter(isVideoUrl)],
  };
};

/** Ảnh bìa của video Cloudinary (khung hình đầu, JPG) — dùng làm poster / ô xem trước. */
export const videoPoster = (url: string) =>
  url.includes('res.cloudinary.com') ? url.replace('/video/upload/', '/video/upload/so_0/').replace(/\.\w+(\?.*)?$/, '.jpg') : undefined;
