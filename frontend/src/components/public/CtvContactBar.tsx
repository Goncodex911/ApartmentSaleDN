import React from 'react';
import { PublicListing } from '../../api/shareApi.js';
import { Phone, MessageCircle, UserCircle } from 'lucide-react';
import { PublicCopy } from '../../utils/publicCopy.js';

/**
 * Thanh liên hệ CTV ghim đáy trang khách (Story 5.3, làm lại Story 12.6): kính mờ, nút cao 48px dưới ngón cái —
 * Chat Zalo là nút chính (60%), Gọi là nút phụ (40%). Cao ~110px + vùng huy hiệu Netlify (pb-badge-safe).
 */
export const CtvContactBar: React.FC<{ ctv: PublicListing['ctv']; copy: PublicCopy }> = ({ ctv, copy }) => {
  // zaloLink do CTV tự nhập → chỉ chấp nhận http(s) để chặn link "javascript:" (XSS)
  const zaloUrl = ctv.zaloLink && /^https?:\/\//i.test(ctv.zaloLink) ? ctv.zaloLink : `https://zalo.me/${ctv.phone}`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-badge-safe bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="max-w-xl mx-auto px-4 pt-2.5 pb-2 space-y-2">
        <div className="flex items-center gap-2.5">
          {ctv.avatarUrl ? (
            <img src={ctv.avatarUrl} alt={ctv.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
          ) : (
            <UserCircle className="w-9 h-9 text-slate-400 shrink-0" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-xs text-slate-600">{copy.consultant}</p>
            <p className="text-sm font-bold text-slate-900 truncate">{ctv.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-[3fr_2fr] gap-2">
          <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="h-12 flex items-center justify-center gap-2 rounded-xl bg-blue-700 text-white text-base font-semibold hover:bg-blue-800">
            <MessageCircle className="w-5 h-5" aria-hidden /> {copy.chatZalo}
          </a>
          <a href={`tel:${ctv.phone}`} className="h-12 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-emerald-800 text-base font-semibold hover:bg-emerald-50">
            <Phone className="w-5 h-5" aria-hidden /> {copy.call}
          </a>
        </div>
      </div>
    </div>
  );
};
