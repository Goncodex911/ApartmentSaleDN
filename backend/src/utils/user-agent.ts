// Thiết bị rút gọn từ User-Agent ("iPhone/iPad · Safari") — đủ để nhận ra "máy lạ", không cần thư viện (Story 16.4, 16.5)
export const deviceOf = (userAgent = '') => {
  const os = /iPhone|iPad/.test(userAgent) ? 'iPhone/iPad' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Mac OS/.test(userAgent) ? 'Mac' : '';
  const app = /Zalo/i.test(userAgent) ? 'Zalo' : /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : /Firefox\//.test(userAgent) ? 'Firefox' : '';
  return [os, app].filter(Boolean).join(' · ') || 'thiết bị không xác định';
};
