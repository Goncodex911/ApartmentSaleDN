import React from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';

/** Vòng xoay kéo-để-làm-mới (Story 9.4); `motion-reduce`: không trượt theo ngón tay, chỉ hiện vòng xoay. */
export const PullIndicator: React.FC<{ pull: number; refreshing: boolean; ready: boolean }> = ({ pull, refreshing, ready }) => {
  if (!pull && !refreshing) return null;
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center motion-reduce:!transform-none"
      style={{ transform: `translate(-50%, ${refreshing ? 16 : pull / 2}px)` }}
    >
      {refreshing ? (
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-label="Đang tải lại" />
      ) : (
        <ArrowDown className={`w-5 h-5 transition-transform ${ready ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} aria-hidden />
      )}
    </div>
  );
};
