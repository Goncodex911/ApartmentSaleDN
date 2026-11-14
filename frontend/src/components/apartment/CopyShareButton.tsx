import React, { useState } from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { buildShareText } from '../../utils/shareText.js';
import { copyText } from '../../utils/clipboard.js';
import { Copy, Check, X } from 'lucide-react';

interface CopyShareButtonProps {
  apartment: Apartment;
  ctv: User | null;
}

export const CopyShareButton: React.FC<CopyShareButtonProps> = ({ apartment, ctv }) => {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState('');
  const isRented = apartment.status === 'RENTED';

  // Sinh tin đồng bộ ngay trong lần chạm (không gọi API) để iOS giữ quyền ghi Clipboard.
  const handleCopy = async () => {
    if (!ctv) return;
    const text = buildShareText(apartment, ctv);
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
        title={isRented ? 'Căn đã cho thuê' : 'Copy bài tư vấn để gửi khách'}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          copied ? 'bg-emerald-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Đã copy' : 'Copy tin gửi khách'}
      </button>

      {/* Fallback cuối: trình duyệt chặn copy tự động → cho CTV nhấn giữ để copy thủ công */}
      {manualText && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
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
