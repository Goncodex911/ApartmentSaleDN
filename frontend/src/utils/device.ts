/** Đang chạy dạng app đã cài ra màn hình chính (Android: display-mode; iPhone: navigator.standalone). */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Thiết bị cảm ứng (điện thoại / máy tính bảng) — máy tính dùng chuột thì false. */
export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
