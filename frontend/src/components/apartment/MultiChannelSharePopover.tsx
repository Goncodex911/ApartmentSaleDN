import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Globe,
  Loader2,
} from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { dispatchZaloShare, dispatchWhatsAppShare } from '../../utils/shareChannel.js';
import { ZaloPostStudioModal } from './ZaloPostStudioModal.js';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal.js';

interface MultiChannelSharePopoverProps {
  apartment: Apartment;
  ctv: User | null;
  compact?: boolean; // Hiển thị nút gọn trong ApartmentCard
}

export const MultiChannelSharePopover: React.FC<MultiChannelSharePopoverProps> = ({
  apartment,
  ctv,
  compact,
}) => {
  const [open, setOpen] = useState(false);
  const [loadingZalo, setLoadingZalo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [showZaloStudio, setShowZaloStudio] = useState(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  // Hành động 1-Chạm Đăng Zalo
  const handleQuickZalo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingZalo(true);
    setOpen(false);

    try {
      const res = await dispatchZaloShare(apartment, ctv);
      setToast(`Đã sao chép bài & tải ${res.photosDownloaded} ảnh! Hãy mở Zalo dán bài.`);
      setTimeout(() => setToast(null), 3500);
    } catch {
      setToast('Lỗi khi chuẩn bị bài đăng.');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoadingZalo(false);
    }
  };

  // Hành động 1-Chạm Gửi WhatsApp
  const handleQuickWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    dispatchWhatsAppShare(apartment, ctv);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Toast thông báo nổi */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Nút kích hoạt Popover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        disabled={apartment.status === 'RENTED' || !ctv}
        title="Chia sẻ đa kênh (Zalo, WhatsApp...)"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
          compact
            ? 'w-11 h-11 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            : 'h-11 px-3 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {loadingZalo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        {!compact && 'Đăng bài'}
      </button>

      {/* Menu thả xuống */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl bg-white border border-slate-200/80 shadow-2xl z-50 p-1.5 text-xs font-medium divide-y divide-slate-100 animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Nhóm Đăng Nhanh 1-Chạm */}
          <div className="p-1 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Chia sẻ 1-Chạm Siêu Tốc
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={handleQuickZalo}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-800 hover:bg-blue-50 hover:text-[#0068ff] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0068ff] text-white flex items-center justify-center font-bold text-[10px]">
                  Z
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Đăng Zalo 1-Chạm</div>
                  <div className="text-[10px] text-slate-600">Copy bài + Tải 4 ảnh + Mở Zalo</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleQuickWhatsApp}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#25d366] text-white flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Gửi WhatsApp (Tiếng Anh)</div>
                  <div className="text-[10px] text-slate-600">Chuẩn Expat + Giá USD + Gần biển</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Nhóm Tùy Chỉnh & Xem Trước */}
          <div className="p-1 space-y-0.5 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowZaloStudio(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Zalo Studio (Spin Text chống spam)</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowWhatsAppPreview(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Xem trước bản WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Zalo Studio */}
      {showZaloStudio && (
        <ZaloPostStudioModal
          apartment={apartment}
          ctv={ctv}
          onClose={() => setShowZaloStudio(false)}
        />
      )}

      {/* Modal WhatsApp Preview */}
      {showWhatsAppPreview && (
        <WhatsAppPreviewModal
          apartment={apartment}
          ctv={ctv}
          onClose={() => setShowWhatsAppPreview(false)}
        />
      )}
    </div>
  );
};
