import { useCallback, useState } from 'react';
import { Lang, readStoredLang, storeLang } from '../utils/shareLang.js';

const PUBLIC_LANG_KEY = 'public-lang';

/**
 * Ngôn ngữ trang xem phòng cho khách (Story 7.3), ưu tiên:
 * ?lang= trên link CTV gửi → lựa chọn khách đã bấm trước đó → ngôn ngữ trình duyệt (en → English) → Tiếng Việt.
 */
function detectLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'en' || fromUrl === 'vi') return fromUrl;
  return readStoredLang(PUBLIC_LANG_KEY) || (navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'vi');
}

export function usePublicLang() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  // Khách tự đổi → nhớ lại để các căn khác (VD bấm căn gợi ý trong chat) mở đúng ngôn ngữ
  const setLang = useCallback((next: Lang) => {
    storeLang(PUBLIC_LANG_KEY, next);
    setLangState(next);
  }, []);
  return { lang, setLang };
}
