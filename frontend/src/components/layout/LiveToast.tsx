import React, { useEffect, useState } from 'react';
import { BadgeCheck, Sparkles, TrendingDown, RotateCcw, X } from 'lucide-react';
import { LiveToastData, LiveToastKind } from '../../hooks/useRealtimeInventory.js';

const ICONS: Record<LiveToastKind, { icon: React.ElementType; tone: string }> = {
  deposited: { icon: BadgeCheck, tone: 'text-sky-600' },
  created: { icon: Sparkles, tone: 'text-emerald-600' },
  available: { icon: RotateCcw, tone: 'text-emerald-600' },
  price: { icon: TrendingDown, tone: 'text-rose-600' },
};
const VISIBLE_MS = 4000;

/**
 * Thông báo nhỏ khi kho phòng đổi (Story 11.4): trượt xuống từ mép trên (dưới tai thỏ) và rút lên đúng đường cũ,
 * tự ẩn sau 4 giây. Không chiếm chỗ trong trang → danh sách không bị đẩy xuống.
 */
export const LiveToast: React.FC<{ toast: LiveToastData | null; onDismiss: () => void; onView: () => void }> = ({ toast, onDismiss, onView }) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const frame = requestAnimationFrame(() => setShown(true)); // Khung đầu ở vị trí ẩn → trượt vào
    const hide = setTimeout(() => setShown(false), VISIBLE_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hide);
    };
  }, [toast]);

  if (!toast) return null;
  const { icon: Icon, tone } = ICONS[toast.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      onTransitionEnd={() => !shown && onDismiss()}
      className={`fixed left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-opacity ${
        shown ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 motion-reduce:translate-y-0'
      }`}
    >
      <div className="flex items-center gap-2 pl-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/5">
        <Icon className={`w-5 h-5 shrink-0 ${tone}`} aria-hidden />
        <p className="flex-1 min-w-0 py-3 text-sm font-medium text-slate-800 line-clamp-2">{toast.text}</p>
        {toast.canView && (
          <button type="button" onClick={() => { onView(); setShown(false); }} className="h-11 px-2 text-sm font-semibold text-brand-navy">
            Xem
          </button>
        )}
        <button type="button" onClick={() => setShown(false)} aria-label="Đóng thông báo" className="w-11 h-11 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
