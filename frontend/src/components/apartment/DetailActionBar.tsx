import React from 'react';
import { Phone } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { Lang } from '../../utils/shareLang.js';
import { CopyShareButton } from './CopyShareButton.js';
import { DownloadPhotosButton } from './DownloadPhotosButton.js';
import { ShareLinkButton } from './ShareLinkButton.js';
import { ShareLangToggle } from './ShareLangToggle.js';

interface DetailActionBarProps {
  apartment: Apartment;
  currentUser: User | null;
  sendablePhotos: string[]; // Ảnh được gửi khách (đã bỏ ảnh có SĐT nguồn cũ)
  hiddenImageCount: number;
  canCallOwner: boolean; // Quản lý thấy SĐT chủ nhà đầy đủ; CTV chỉ thấy số đã che → không có nút gọi
  shareLang: Lang;
  onShareLangChange: (lang: Lang) => void;
}

/**
 * Thanh hành động ghim đáy chi tiết căn (Story 12.6), kính mờ, nút cao ≥ 48px dưới ngón cái:
 * hàng 1 = ngôn ngữ gửi khách + Tải ảnh (+ Gọi chủ nhà cho Quản lý); hàng 2 = Gửi khách (60%) · Tạo link (40%).
 */
export const DetailActionBar: React.FC<DetailActionBarProps> = ({ apartment, currentUser, sendablePhotos, hiddenImageCount, canCallOwner, shareLang, onShareLangChange }) => (
  <div key={apartment._id} className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 pt-2 pb-badge-safe sm:pb-3 space-y-2">
    <div className="flex items-center gap-2">
      <ShareLangToggle value={shareLang} onChange={onShareLangChange} />
      <div className="ml-auto flex gap-1.5">
        {canCallOwner && apartment.ownerContact?.phone && (
          <a
            href={`tel:${apartment.ownerContact.phone}`}
            aria-label={`Gọi chủ nhà ${apartment.ownerContact.phone}`}
            className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-300 bg-white text-emerald-800 hover:bg-emerald-50"
          >
            <Phone className="w-5 h-5" aria-hidden />
          </a>
        )}
        <DownloadPhotosButton photos={sendablePhotos} fileName={`can-ho-${apartment._id}`} compact />
      </div>
    </div>
    <div className="grid grid-cols-[3fr_2fr] gap-2">
      <CopyShareButton apartment={apartment} ctv={currentUser} lang={shareLang} primary />
      <ShareLinkButton apartmentId={apartment._id} disabled={apartment.status === 'RENTED'} lang={shareLang} />
    </div>
    {hiddenImageCount > 0 && <p className="text-xs text-slate-600">Đã ẩn {hiddenImageCount} ảnh có SĐT nguồn cũ khi gửi khách</p>}
  </div>
);
