import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ingestionApi } from '../../api/ingestionApi.js';
import { formatVnd } from '../../utils/format.js';

interface ApartmentSummary {
  _id: string;
  title: string;
  price?: number;
  image?: string;
}

interface MergeResultCardProps {
  result: {
    isDuplicate?: boolean;
    masterApartmentId?: string;
    subListingId?: string;
    apartmentId?: string;
    apartment?: ApartmentSummary;
    matchReason?: string;
    possibleDuplicateOf?: ApartmentSummary;
  };
  onView: (apartmentId: string) => void;
  onChanged: () => void;
}

const buttonBase = 'min-h-[44px] px-3 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors duration-100';

/**
 * Story 20.2: căn AI vừa gộp vào / căn "có thể trùng" + nút sửa lại quyết định của AI.
 * - Đã gộp: Xem căn · Không phải căn này — tạo căn mới.
 * - Có thể trùng (Story 20.1): Giữ là căn riêng · Gộp vào căn này.
 */
export const MergeResultCard: React.FC<MergeResultCardProps> = ({ result, onView, onChanged }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const merged = result.isDuplicate && result.subListingId ? result.apartment : undefined;
  const candidate = merged || result.possibleDuplicateOf;
  if (!candidate) return null;

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setError('');
    try {
      await action();
      setDone(message);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thực hiện được, vui lòng thử lại');
    } finally {
      setBusy(null);
    }
  };

  const split = () =>
    window.confirm('Tách tin vừa dán thành căn mới riêng? AI sẽ đọc lại tin gốc để tạo căn.') &&
    run('split', () => ingestionApi.split(result.masterApartmentId!, result.subListingId!), 'Đã tách thành căn mới.');
  const keep = () => run('keep', () => ingestionApi.keepSeparate(result.apartmentId!), 'Đã giữ là căn riêng.');
  const mergeInto = () =>
    window.confirm(`Gộp căn vừa tạo vào "${candidate.title}"? Căn vừa tạo sẽ chuyển vào Thùng rác.`) &&
    run('merge', () => ingestionApi.mergeInto(result.apartmentId!, candidate._id), 'Đã gộp vào căn có sẵn.');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{merged ? 'Đã gộp vào căn' : 'Có thể trùng căn'}</p>
      <button type="button" onClick={() => onView(candidate._id)} className="w-full flex items-center gap-3 text-left rounded-lg active:bg-slate-50">
        {candidate.image ? (
          <img src={candidate.image} alt="" className="w-16 h-16 shrink-0 rounded-lg object-cover bg-slate-100" />
        ) : (
          <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-100" aria-hidden />
        )}
        <span className="min-w-0 space-y-0.5">
          <span className="block text-sm font-semibold text-slate-900 line-clamp-2">{candidate.title}</span>
          {candidate.price ? <span className="block text-sm text-slate-700">{formatVnd(candidate.price)}/tháng</span> : null}
          {merged && result.matchReason && <span className="block text-xs text-slate-500">Lý do: {result.matchReason}</span>}
        </span>
      </button>

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {done ? (
        <p role="status" className="text-sm font-medium text-emerald-700">{done}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {merged ? (
            <>
              <button type="button" onClick={() => onView(candidate._id)} className={`${buttonBase} border border-slate-300 text-slate-800 active:bg-slate-100`}>
                Xem căn
              </button>
              <button type="button" onClick={split} disabled={Boolean(busy)} className={`${buttonBase} bg-slate-900 text-white active:bg-slate-700`}>
                {busy === 'split' && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Không phải căn này
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={keep} disabled={Boolean(busy)} className={`${buttonBase} border border-slate-300 text-slate-800 active:bg-slate-100`}>
                {busy === 'keep' && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Giữ là căn riêng
              </button>
              <button type="button" onClick={mergeInto} disabled={Boolean(busy)} className={`${buttonBase} bg-slate-900 text-white active:bg-slate-700`}>
                {busy === 'merge' && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Gộp vào căn này
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
