import React from 'react';
import { PublicListing } from '../../api/shareApi.js';
import { Phone, MessageCircle, UserCircle } from 'lucide-react';

// Thanh liên hệ CTV cố định ở chân màn hình (Story 5.3 - AC3)
export const CtvContactBar: React.FC<{ ctv: PublicListing['ctv'] }> = ({ ctv }) => {
  // zaloLink do CTV tự nhập → chỉ chấp nhận http(s) để chặn link "javascript:" (XSS)
  const zaloUrl = ctv.zaloLink && /^https?:\/\//i.test(ctv.zaloLink) ? ctv.zaloLink : `https://zalo.me/${ctv.phone}`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
        {ctv.avatarUrl ? (
          <img src={ctv.avatarUrl} alt={ctv.name} className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0" />
        ) : (
          <UserCircle className="w-11 h-11 text-slate-300 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400">Tư vấn viên</p>
          <p className="text-sm font-bold text-slate-800 truncate">{ctv.name}</p>
        </div>
        <a href={`tel:${ctv.phone}`} className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
          <Phone className="w-4 h-4" /> Gọi ngay
        </a>
        <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold">
          <MessageCircle className="w-4 h-4" /> Chat Zalo
        </a>
      </div>
    </div>
  );
};
