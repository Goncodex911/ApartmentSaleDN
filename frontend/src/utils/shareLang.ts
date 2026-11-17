export type Lang = 'vi' | 'en';

const SHARE_LANG_KEY = 'share-lang';

// localStorage có thể bị chặn (ẩn danh, trình duyệt trong Zalo) → luôn bọc try/catch, mặc định tiếng Việt
export const readStoredLang = (key: string): Lang | null => {
  try {
    const value = localStorage.getItem(key);
    return value === 'en' || value === 'vi' ? value : null;
  } catch {
    return null;
  }
};
export const storeLang = (key: string, lang: Lang) => {
  try {
    localStorage.setItem(key, lang);
  } catch {
    /* bỏ qua: chỉ mất khả năng nhớ lựa chọn */
  }
};

/** Ngôn ngữ CTV chọn để gửi khách (Story 7.3) — dùng chung cho chi tiết căn, thẻ danh sách, màn ghép khách. */
export const getShareLang = (): Lang => readStoredLang(SHARE_LANG_KEY) || 'vi';
export const setShareLang = (lang: Lang) => storeLang(SHARE_LANG_KEY, lang);

/** Link xem phòng kèm ngôn ngữ: tiếng Anh thêm ?lang=en, tiếng Việt giữ nguyên link gốc. */
export const withLang = (url: string, lang: Lang) => (lang === 'en' ? `${url}${url.includes('?') ? '&' : '?'}lang=en` : url);
