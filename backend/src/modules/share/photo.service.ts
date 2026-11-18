/**
 * Ảnh được phép gửi khách = images − hiddenImages (ảnh dán SĐT nguồn cũ — Story 5.2).
 * Story 10.3: tải ảnh gửi khách giờ lấy thẳng từ Cloudinary trên trình duyệt, không còn in SĐT CTV lên ảnh ở server.
 */
export function getVisibleImages(apartment: { images?: string[]; hiddenImages?: string[] }): string[] {
  const hidden = new Set(apartment.hiddenImages || []);
  return (apartment.images || []).filter((url) => !hidden.has(url));
}
