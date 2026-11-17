import React, { useState } from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { buildShareText } from '../../utils/shareText.js';
import { buildShareTextEn } from '../../utils/shareTextEn.js';
import { Lang, getShareLang } from '../../utils/shareLang.js';
import { copyText } from '../../utils/clipboard.js';
import { Copy, Check, X } from 'lucide-react';

interface CopyShareButtonProps {
  apartment: Apartment;
  ctv: User | null;
  compact?: boolean; // Chỉ hiện icon (dùng trong thẻ danh sách)
  lang?: Lang; // Không truyền → dùng ngôn ngữ CTV đã chọn gần nhất (Story 7.3)
}

export const CopyShareButton: React.FC<CopyShareButtonProps> = ({ apartment, ctv, compact, lang }) => {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState('');
  const isRented = apartment.status === 'RENTED';

  // Sinh tin đồng bộ ngay trong lần chạm (không gọi API) để iOS giữ quyền ghi Clipboard.
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Nằm trong thẻ căn hộ bấm được → không mở chi tiết khi bấm Copy
    if (!ctv) return;
    const text = (lang || getShareLang()) === 'en' ? buildShareTextEn(apartment, ctv) : buildShareText(apartment, ctv);
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setManualText(text);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={isRented || !ctv}
        title={isRented ? 'Căn đã cho thuê' : 'Copy tin gửi khách'}
        aria-label={copied ? 'Đã copy tin gửi khách' : 'Copy tin gửi khách'}
        className={`flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          compact ? 'w-11 h-11 shrink-0' : 'w-full h-11 px-3'
        } ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {!compact && (copied ? 'Đã copy' : 'Copy tin')}
      </button>

      {/* Fallback cuối: trình duyệt chặn copy tự động → cho CTV nhấn giữ để copy thủ công */}
      {manualText && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Nhấn giữ để copy tin gửi khách</p>
              <button type="button" onClick={() => setManualText('')} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              readOnly
              autoFocus
              value={manualText}
              onFocus={(e) => e.currentTarget.select()}
              rows={10}
              className="w-full p-3 text-sm border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
        </div>
      )}
    </>
  );
};
