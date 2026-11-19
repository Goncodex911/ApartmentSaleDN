import React, { useState } from 'react';
import { shareApi, ShareLinkInfo } from '../../api/shareApi.js';
import { copyText } from '../../utils/clipboard.js';
import { tapFeedback } from '../../utils/haptics.js';
import { Lang, getShareLang, withLang } from '../../utils/shareLang.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Link2, Loader2, Copy, Check, ExternalLink, Eye, X } from 'lucide-react';

interface ShareLinkButtonProps {
  apartmentId: string;
  disabled?: boolean;
  lang?: Lang; // English → link có ?lang=en (Story 7.3)
  compact?: boolean; // Story 12.2: chỉ icon trên thẻ căn, khung link mở trong bảng trượt
}

const formatViewedAt = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({ apartmentId, disabled, lang, compact }) => {
  const [link, setLink] = useState<ShareLinkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [open, setOpen] = useState(false); // Story 10.1: khung link đóng / mở được

  // Bấm lần đầu: tạo link + mở khung; bấm lại: đóng khung. Mỗi lần mở lại cập nhật số lượt xem (backend luôn trả về cùng 1 link)
  const handleLoadLink = async () => {
    if (open) return setOpen(false);
    tapFeedback();
    setOpen(true);
    setLoading(true);
    setError('');
    try {
      setLink(await shareApi.createLink(apartmentId));
    } catch {
      setError('Không tạo được link, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const url = link ? withLang(link.url, lang || getShareLang()) : '';

  // Copy ở lần chạm riêng vì iOS không cho ghi Clipboard sau khi chờ API
  const handleCopy = async () => {
    if (!link) return;
    setCopyState((await copyText(url)) ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const details = (
    <>
      {error && <p className="text-rose-700">{error}</p>}
      {compact && loading && <Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-500" aria-label="Đang tạo link" />}
      {link && (
        <>
          <p className="font-mono text-slate-700 break-all select-all">{url}</p>
          <p className="flex items-center gap-1 text-slate-600">
            <Eye className="w-3.5 h-3.5" aria-hidden />
            {link.views > 0 ? `${link.views} lượt xem${link.lastViewedAt ? ` · lần cuối ${formatViewedAt(link.lastViewedAt)}` : ''}` : 'Khách chưa mở link'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCopy} className="flex-1 h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-sky-700 text-white font-semibold">
              {copyState === 'copied' ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copyState === 'copied' ? 'Đã copy' : copyState === 'failed' ? 'Nhấn giữ link để copy' : 'Copy link'}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="h-11 flex items-center gap-1.5 px-3 rounded-xl border border-sky-200 text-sky-800 font-semibold">
              <ExternalLink className="w-4 h-4" aria-hidden /> Mở thử
            </a>
          </div>
        </>
      )}
    </>
  );

  if (compact) {
    return (
      // Chặn lan sự kiện: bảng trượt render qua portal nhưng React vẫn truyền click lên thẻ căn → không mở chi tiết
      <span onClick={(e) => e.stopPropagation()} className="contents">
        <button
          type="button"
          onClick={handleLoadLink}
          disabled={disabled}
          aria-label="Tạo link xem phòng cho khách"
          title={disabled ? 'Căn đã cho thuê' : 'Tạo link khách'}
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Link2 className="w-4 h-4" aria-hidden />
        </button>
        {open && (
          <BottomSheet title="Link xem phòng" onClose={() => setOpen(false)} showClose>
            <div className="space-y-3 text-sm">{details}</div>
          </BottomSheet>
        )}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLoadLink}
        disabled={disabled || loading}
        title={disabled ? 'Căn đã cho thuê' : undefined}
        className="w-full h-12 flex items-center justify-center gap-1.5 px-3 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Link2 className="w-4 h-4" aria-hidden />}
        {link ? 'Lượt xem' : 'Tạo link'}
      </button>

      {open && (link || error) && (
        <div className="relative col-span-full p-3 pr-12 rounded-xl bg-slate-50 text-sm space-y-2">
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng khung link" className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
          {details}
        </div>
      )}
    </>
  );
};
