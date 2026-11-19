import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { LeadMatchedApartment, leadApi } from '../../api/leadApi.js';
import { formatVnd } from '../../utils/format.js';

// '' = "Không chọn căn" (chuyển giai đoạn, không báo Quản lý); undefined = chưa chọn gì
export type DepositChoice = string | undefined;

/**
 * Story 14.8: khách đặt cọc → CTV chọn căn đã cọc trong danh sách căn phù hợp (Story 11.1).
 * Chọn căn → Quản lý nhận thông báo xác nhận; trạng thái căn không tự đổi.
 */
export const DepositApartmentPicker: React.FC<{ leadId: string; value: DepositChoice; onChange: (value: string) => void }> = ({ leadId, value, onChange }) => {
  const [matches, setMatches] = useState<LeadMatchedApartment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Bảng trượt mở 50% → bảng chọn có thể nằm dưới mép màn hình: đưa vào tầm nhìn ngay khi bấm "Đã đặt cọc"
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rootRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, []);

  const load = useCallback(() => {
    setFailed(false);
    setMatches(null);
    leadApi.getMatches(leadId).then(setMatches).catch(() => setFailed(true));
  }, [leadId]);
  useEffect(load, [load]);

  const option = (id: string, title: string, detail?: string) => {
    const selected = value === id;
    return (
      <button
        key={id || 'none'}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onChange(id)}
        className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl border text-left cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
          selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white active:bg-slate-50'
        }`}
      >
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-800 truncate">{title}</span>
          {detail && <span className="block text-xs text-slate-600 truncate">{detail}</span>}
        </span>
        <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`} aria-hidden>
          {selected && <Check className="w-4 h-4" />}
        </span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="space-y-2 scroll-mb-4" aria-busy={!matches && !failed}>
      <p id="deposit-picker-label" className="text-xs font-semibold text-slate-700">Khách đã cọc căn nào? Quản lý sẽ nhận thông báo để xác nhận.</p>
      <div role="radiogroup" aria-labelledby="deposit-picker-label" className="space-y-1.5 max-h-64 overflow-y-auto">
        {!matches && !failed && [0, 1].map((key) => <div key={key} className="skeleton h-14 rounded-xl" />)}
        {failed && (
          <p className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 text-xs text-rose-700">
            Không tải được danh sách căn
            <button type="button" onClick={load} className="min-h-[44px] px-3 rounded-lg bg-white font-semibold">Thử lại</button>
          </p>
        )}
        {matches?.length === 0 && <p className="px-1 text-xs text-slate-600">Chưa có căn phù hợp — chọn "Không chọn căn" và ghi chú căn khách cọc.</p>}
        {matches?.map(({ apartment }) => option(apartment._id, apartment.title, formatVnd(apartment.price)))}
        {option('', 'Không chọn căn', 'Chỉ chuyển giai đoạn, không báo Quản lý')}
      </div>
    </div>
  );
};
