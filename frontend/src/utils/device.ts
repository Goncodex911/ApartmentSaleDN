/** Đang chạy dạng app đã cài ra màn hình chính (Android: display-mode; iPhone: navigator.standalone). */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Thiết bị cảm ứng (điện thoại / máy tính bảng) — máy tính dùng chuột thì false. */
export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

// Thiết bị rút gọn từ User-Agent ("iPhone/iPad · Safari") — đủ để nhận ra "máy lạ", không cần thư viện (Story 13.3, 16.4)
export const deviceOf = (userAgent = '') => {
  const os = /iPhone|iPad/.test(userAgent) ? 'iPhone/iPad' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Mac OS/.test(userAgent) ? 'Mac' : '';
  const app = /Zalo/i.test(userAgent) ? 'Zalo' : /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : /Firefox\//.test(userAgent) ? 'Firefox' : '';
  return [os, app].filter(Boolean).join(' · ') || 'Không rõ thiết bị';
};
