import React, { useState } from 'react';
import { shareApi, ShareLinkInfo } from '../../api/shareApi.js';
import { copyText } from '../../utils/clipboard.js';
import { Lang, getShareLang, withLang } from '../../utils/shareLang.js';
import { Link2, Loader2, Copy, Check, ExternalLink, Eye } from 'lucide-react';

interface ShareLinkButtonProps {
  apartmentId: string;
  disabled?: boolean;
  lang?: Lang; // English → link có ?lang=en (Story 7.3)
}

const formatViewedAt = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({ apartmentId, disabled, lang }) => {
  const [link, setLink] = useState<ShareLinkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Bấm lần đầu: tạo link; bấm lại: làm mới số lượt xem (backend luôn trả về cùng 1 link)
  const handleLoadLink = async () => {
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

  return (
    <>
      <button
        type="button"
        onClick={handleLoadLink}
        disabled={disabled || loading}
        title={disabled ? 'Căn đã cho thuê' : undefined}
        className="w-full h-11 flex items-center justify-center gap-1.5 px-3 text-sm font-medium rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {link ? 'Lượt xem' : 'Tạo link'}
      </button>

      {(link || error) && (
        <div className="col-span-3 p-3 rounded-xl bg-slate-50 text-sm space-y-2">
          {error && <p className="text-rose-600">{error}</p>}
          {link && (
            <>
              <p className="font-mono text-slate-700 break-all select-all">{url}</p>
              <p className="flex items-center gap-1 text-slate-500">
                <Eye className="w-3.5 h-3.5" />
                {link.views > 0
                  ? `${link.views} lượt xem${link.lastViewedAt ? ` · lần cuối ${formatViewedAt(link.lastViewedAt)}` : ''}`
                  : 'Khách chưa mở link'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold">
                  {copyState === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copyState === 'copied' ? 'Đã copy' : copyState === 'failed' ? 'Nhấn giữ link để copy' : 'Copy link'}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sky-200 text-sky-700 font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" /> Mở thử
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
