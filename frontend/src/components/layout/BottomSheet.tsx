import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSheetDrag } from '../../hooks/useSheetDrag.js';

// Nhiều bảng chồng nhau (VD Căn phù hợp mở từ chi tiết khách) → Esc chỉ đóng bảng trên cùng
const openSheets: string[] = [];
const desktopQuery = '(min-width: 640px)';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // VD [0.5, 0.9] — mở ở nấc đầu; không truyền = cao vừa nội dung (tối đa 90%)
  footer?: React.ReactNode; // Thanh nút ghim đáy (không cuộn theo nội dung)
  showClose?: boolean; // Nút X — đóng có hiệu ứng trượt xuống như khi vuốt
  wide?: boolean; // Máy tính: rộng max-w-lg thay vì max-w-md
}

/**
 * Bảng trượt từ đáy (Story 12.3): thanh kéo, kéo bám tay, vuốt xuống để đóng, nấc 50% / 90%, nền mờ đổi theo độ mở.
 * Render qua portal ra <body> — transform khi kéo không làm lệch các hộp `fixed` lồng bên trong.
 * Máy tính (≥ 640px): hộp thoại giữa màn hình, không kéo. Esc / chạm nền mờ → đóng (có hiệu ứng trượt xuống).
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ title, onClose, children, snapPoints, footer, showClose, wide }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [isMobile] = useState(() => !window.matchMedia(desktopQuery).matches);
  const { handleProps, dismiss } = useSheetDrag({ sheetRef, overlayRef, contentRef, snapPoints, enabled: isMobile, onClose });

  // Trợ năng: đưa con trỏ bàn phím vào bảng khi mở, trả lại chỗ cũ khi đóng; Esc đóng bảng trên cùng
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Không cướp con trỏ của ô nhập có autoFocus bên trong
    if (!sheetRef.current?.contains(document.activeElement)) sheetRef.current?.focus({ preventScroll: true });
    openSheets.push(titleId);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openSheets[openSheets.length - 1] === titleId && dismiss();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openSheets.splice(openSheets.indexOf(titleId), 1);
      previous?.focus?.({ preventScroll: true });
    };
  }, [dismiss, titleId]);

  const maxSnap = snapPoints ? Math.max(...snapPoints) : 0.9;

  return createPortal(
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div ref={overlayRef} className="absolute inset-0 bg-black/40 backdrop-blur-sm touch-none" style={{ opacity: isMobile ? 0 : 1 }} onClick={() => dismiss()} aria-hidden />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // Điện thoại: đặt sẵn ngoài màn hình (translateY 100%) → hook trượt lên; cao cố định theo nấc lớn nhất nếu có nấc
        style={isMobile ? { transform: 'translate3d(0, 100%, 0)', height: snapPoints ? `${maxSnap * 100}dvh` : undefined, maxHeight: `${maxSnap * 100}dvh` } : undefined}
        className={`absolute inset-x-0 bottom-0 flex flex-col bg-white rounded-t-2xl shadow-2xl shadow-slate-900/20 outline-none will-change-transform sm:relative sm:inset-auto sm:w-full sm:max-h-[85vh] sm:rounded-2xl ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`}
      >
        <div {...handleProps} className="shrink-0 px-4 pt-2 pb-2 touch-none select-none cursor-grab active:cursor-grabbing sm:cursor-default">
          <div className="w-10 h-1.5 mx-auto mb-2 rounded-full bg-slate-300 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-2 min-h-[32px]">
            <h2 id={titleId} className="text-base font-semibold text-slate-900 truncate">{title}</h2>
            <div className="flex items-center shrink-0">
              {showClose && (
                <button type="button" onClick={() => dismiss()} aria-label="Đóng" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div ref={contentRef} className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-4 ${footer ? 'pb-4' : 'pb-badge-safe sm:pb-4'}`}>
          {children}
        </div>
        {footer && <div className="shrink-0 px-4 pt-3 pb-badge-safe sm:pb-4 border-t border-slate-100 bg-white">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
