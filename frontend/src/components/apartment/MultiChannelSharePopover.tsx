import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ExternalLink, Globe, Loader2, Send, Share2, Sparkles, X } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { shareApi, ShareLinkInfo } from '../../api/shareApi.js';
import { dispatchWhatsAppShare, dispatchZaloShare, zaloOpenUrl } from '../../utils/shareChannel.js';
import { ZaloPostStudioModal } from './ZaloPostStudioModal.js';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal.js';

interface MultiChannelSharePopoverProps {
  apartment: Apartment;
  ctv: User | null;
  compact?: boolean; // Hiển thị nút gọn trong ApartmentCard
}

const MENU_WIDTH = 256;
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Story 19.8: menu / modal / thông báo đưa ra document.body (không bị overflow-hidden của thẻ căn cắt mất).
 * Sự kiện React vẫn nổi bọt theo cây component kể cả qua portal → bọc chặn click + phím,
 * bấm / gõ Enter trong modal không mở nhầm chi tiết căn hay chọn căn vào Tour.
 */
const Layer: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(
    <div onClick={stop} onKeyDown={stop} onPointerDown={stop}>
      {children}
    </div>,
    document.body
  );

type Toast = { text: string; tone: 'ok' | 'error'; openZalo?: boolean };

export const MultiChannelSharePopover: React.FC<MultiChannelSharePopoverProps> = ({ apartment, ctv, compact }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [link, setLink] = useState<ShareLinkInfo | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<'zalo' | 'whatsapp' | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Story 19.1: tạo link chia sẻ thật ngay khi mở menu → lúc bấm Zalo / WhatsApp đã có sẵn, thao tác chạy trọn trong cú bấm
  const loadLink = () => {
    setLinkError(false);
    shareApi
      .getLink(apartment._id)
      .then(setLink)
      .catch(() => setLinkError(true));
  };

  // Đặt menu sát nút, luôn nằm trọn trong màn hình (màn hẹp 360px không bị cắt); thiếu chỗ phía trên thì mở xuống dưới
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPosition(rect.top > 280 ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.openZalo ? 8000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && !link) loadLink();
    setOpen((prev) => !prev);
  };

  const quickZalo = async () => {
    if (!link) return;
    setOpen(false);
    setBusy(true);
    try {
      const { photosDownloaded, photosTotal } = await dispatchZaloShare(apartment, ctv, link);
      const photoText = photosTotal ? ` và tải ${photosDownloaded}/${photosTotal} ảnh` : '';
      setToast({ text: `Đã sao chép bài${photoText}. Mở Zalo rồi dán bài.`, tone: 'ok', openZalo: true });
    } catch {
      setToast({ text: 'Không chuẩn bị được bài đăng, vui lòng thử lại.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const quickWhatsApp = () => {
    if (!link) return;
    setOpen(false);
    dispatchWhatsAppShare(apartment, ctv, link);
  };

  const item = 'w-full flex items-center gap-2 min-h-11 px-3 py-2 rounded-xl text-left transition-colors disabled:opacity-50 disabled:pointer-events-none';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={apartment.status === 'RENTED' || !ctv}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Chia sẻ đa kênh (Zalo, WhatsApp...)"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
          compact
            ? 'w-11 h-11 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            : 'h-11 px-3 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <Share2 className="w-4 h-4" aria-hidden />}
        {!compact && 'Đăng bài'}
      </button>

      {open && (
        <Layer>
          <div
            ref={menuRef}
            role="menu"
            style={{ ...position, width: MENU_WIDTH }}
            className="fixed z-[60] rounded-2xl bg-white border border-slate-200/80 shadow-2xl p-1.5 text-xs font-medium divide-y divide-slate-100 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
          >
            {!link && (
              <p className="flex items-center gap-2 px-3 py-2 text-slate-600" aria-live="polite">
                {linkError ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" aria-hidden /> Không tạo được link.
                    <button type="button" onClick={loadLink} className="ml-auto min-h-9 px-2 font-semibold text-indigo-700">Thử lại</button>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> Đang tạo link xem phòng...
                  </>
                )}
              </p>
            )}
            <div className="p-1 space-y-1">
              <p className="px-2 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Chia sẻ 1-chạm</p>
              <button type="button" role="menuitem" onClick={quickZalo} disabled={!link} className={`${item} justify-between text-slate-800 hover:bg-blue-50`}>
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#0068ff] text-white grid place-items-center font-bold text-[10px]" aria-hidden>Z</span>
                  <span>
                    <span className="block font-semibold text-slate-900">Đăng Zalo 1-chạm</span>
                    <span className="block text-[10px] text-slate-600">Copy bài + tải 4 ảnh</span>
                  </span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" aria-hidden />
              </button>
              <button type="button" role="menuitem" onClick={quickWhatsApp} disabled={!link} className={`${item} justify-between text-slate-800 hover:bg-emerald-50`}>
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#25d366] text-white grid place-items-center" aria-hidden><Send className="w-3.5 h-3.5" /></span>
                  <span>
                    <span className="block font-semibold text-slate-900">Gửi WhatsApp (tiếng Anh)</span>
                    <span className="block text-[10px] text-slate-600">Giá USD + gần biển</span>
                  </span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" aria-hidden />
              </button>
            </div>
            <div className="p-1 pt-1 space-y-0.5">
              <button type="button" role="menuitem" disabled={!link} onClick={() => { setOpen(false); setModal('zalo'); }} className={`${item} text-slate-700 hover:bg-slate-100`}>
                <Sparkles className="w-4 h-4 text-amber-500" aria-hidden /> Zalo Studio (đổi giọng văn)
              </button>
              <button type="button" role="menuitem" disabled={!link} onClick={() => { setOpen(false); setModal('whatsapp'); }} className={`${item} text-slate-700 hover:bg-slate-100`}>
                <Globe className="w-4 h-4 text-emerald-600" aria-hidden /> Xem trước bản WhatsApp
              </button>
            </div>
          </div>
        </Layer>
      )}

      {toast && (
        <Layer>
          <div
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="fixed top-16 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-2xl"
          >
            <span className="flex-1">{toast.text}</span>
            {toast.openZalo && (
              <a href={zaloOpenUrl()} target="_blank" rel="noopener noreferrer" onClick={() => setToast(null)} className="shrink-0 min-h-11 px-3 grid place-items-center rounded-xl bg-[#0068ff] font-semibold">
                Mở Zalo
              </a>
            )}
            <button type="button" onClick={() => setToast(null)} aria-label="Đóng thông báo" className="shrink-0 w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-white">
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </Layer>
      )}

      {modal && link && (
        <Layer>
          {modal === 'zalo' ? (
            <ZaloPostStudioModal apartment={apartment} ctv={ctv} link={link.url} onClose={() => setModal(null)} />
          ) : (
            <WhatsAppPreviewModal apartment={apartment} ctv={ctv} link={link} onClose={() => setModal(null)} />
          )}
        </Layer>
      )}
    </>
  );
};
