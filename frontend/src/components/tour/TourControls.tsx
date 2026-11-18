import React, { useMemo, useState } from 'react';
import { useTourSelection } from '../../hooks/useTourSelection.js';
import { TourBar } from './TourBar.js';
import { TourPlanSheet } from './TourPlanSheet.js';
import { CompareSheet } from './CompareSheet.js';

/** Thanh nổi chọn căn + 2 màn hình dùng chung lựa chọn: Lộ trình (Story 11.3) và So sánh 2–3 căn (Story 11.6). */
export const TourControls: React.FC<{ tour: ReturnType<typeof useTourSelection> }> = ({ tour }) => {
  const [sheet, setSheet] = useState<'plan' | 'compare' | null>(null);
  // Giữ nguyên mảng khi lựa chọn không đổi → màn hình Lộ trình / So sánh không tải lại mỗi lần trang render (VD có sự kiện real-time)
  const ids = useMemo(() => tour.picks.map((pick) => pick.id), [tour.picks]);
  if (!tour.active) return null;

  return (
    <>
      <TourBar count={ids.length} onPlan={() => setSheet('plan')} onCancel={tour.cancel}>
        <button
          type="button"
          disabled={ids.length < 2 || ids.length > 3} // Chọn 4 căn thì chỉ còn Lộ trình
          onClick={() => setSheet('compare')}
          className="h-11 px-3 shrink-0 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40"
        >
          So sánh
        </button>
      </TourBar>
      {sheet === 'plan' && <TourPlanSheet ids={ids} onClose={() => setSheet(null)} />}
      {sheet === 'compare' && <CompareSheet ids={ids} onClose={() => setSheet(null)} />}
    </>
  );
};
