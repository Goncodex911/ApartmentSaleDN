import React from 'react';
import { Route, X } from 'lucide-react';
import { MAX_TOUR_STOPS } from '../../utils/tourRoute.js';

interface TourBarProps {
  count: number;
  onPlan: () => void;
  onCancel: () => void;
  children?: React.ReactNode; // Nút phụ (VD So sánh — Story 11.6)
}

/**
 * Thanh nổi chế độ chọn căn (Story 11.3): nằm ngay trên menu đáy + huy hiệu Netlify, nền mờ để không che mất danh sách.
 * "Tạo lộ trình" cần ít nhất 2 căn.
 */
export const TourBar: React.FC<TourBarProps> = ({ count, onPlan, onCancel, children }) => (
  <div className="fixed inset-x-0 z-40 px-3 bottom-[calc(128px+env(safe-area-inset-bottom))] md:bottom-[calc(80px+env(safe-area-inset-bottom))]">
    <div role="toolbar" aria-label="Chọn căn dẫn khách" className="mx-auto max-w-md flex items-center gap-2 p-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/5">
      <button type="button" onClick={onCancel} aria-label="Hủy chọn căn" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
        <X className="w-5 h-5" />
      </button>
      <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800" aria-live="polite">
        Đã chọn {count}/{MAX_TOUR_STOPS} căn
      </p>
      {children}
      <button
        type="button"
        disabled={count < 2}
        onClick={onPlan}
        className="h-11 px-3.5 shrink-0 flex items-center gap-1.5 rounded-xl bg-brand-navy text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.97] transition-transform duration-100 motion-reduce:transform-none"
      >
        <Route className="w-4 h-4" aria-hidden /> Lộ trình
      </button>
    </div>
  </div>
);
