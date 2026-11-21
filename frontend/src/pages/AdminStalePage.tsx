import React, { useState } from 'react';
import { Archive, WifiOff } from 'lucide-react';
import { BulkStaleInput, StaleQuery, adminApi } from '../api/adminApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Select, fieldClass } from '../components/ui/Input.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { STATUS_STYLE } from '../utils/statusStyle.js';
import { ZONES } from '../utils/danang.js';
import { formatVnd, timeAgo } from '../utils/format.js';

type Action = BulkStaleInput['action'];
const ACTION_TEXT: Record<Action, string> = { UPCOMING: 'Chuyển Sắp trống', NEEDS_REVIEW: 'Đánh dấu cần kiểm tra', DELETE: 'Chuyển vào Thùng rác' };
const MAX_SELECT = 100;

/** [ADMIN] Story 16.7: Kho tồn — căn đang chào không cập nhật > 30/60/90 ngày; chọn nhiều để xử lý hàng loạt (≤ 100 căn). */
export const AdminStalePage: React.FC = () => {
  const [query, setQuery] = useState<StaleQuery>({ days: 30 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action | null>(null);
  const [availableDate, setAvailableDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = usePagedList(JSON.stringify(query), '', (page) => adminApi.listStale({ ...query, page }));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECT) next.add(id);
      return next;
    });
  const changeQuery = (patch: Partial<StaleQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
    setSelected(new Set());
  };

  const runBulk = async () => {
    if (!action) return;
    setBusy(true);
    setMessage(null);
    const ids = [...selected];
    try {
      const input: BulkStaleInput = action === 'UPCOMING' ? { action, ids, availableDate: new Date(`${availableDate}T00:00:00`).toISOString() } : { action, ids };
      const { done, total: requested } = await adminApi.bulkStale(input);
      setMessage({ tone: 'ok', text: `${ACTION_TEXT[action]}: xong ${done}/${requested} căn` });
      setSelected(new Set());
      setAction(null);
      reload();
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.response?.data?.message || 'Không thực hiện được, vui lòng thử lại' });
    } finally {
      setBusy(false);
    }
  };

  const renderList = () => {
    if (state === 'loading') return <div className="space-y-2" aria-busy="true" aria-label="Đang tải kho tồn">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
    if (state === 'error') return <EmptyState icon={WifiOff} title="Không tải được kho tồn" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    if (!items.length) return <EmptyState icon={Archive} title="Không có căn tồn" description={`Mọi căn đang chào đều được cập nhật trong ${query.days} ngày qua.`} />;
    return (
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = selected.has(item._id);
          return (
            <li key={item._id}>
              <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors duration-100 ${checked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(item._id)} className="mt-1 w-5 h-5 accent-indigo-600 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900 truncate">{item.title}</span>
                  <span className="block text-sm text-slate-600">{formatVnd(item.price)} · {STATUS_STYLE[item.status]?.label} · {item.location.zone || item.location.district || 'Chưa rõ khu vực'}</span>
                  <span className="block text-xs text-slate-600">Cập nhật {timeAgo(item.updatedAt)}{item.managerId ? ` · ${item.managerId.name}` : ''}{item.needsReview ? ' · đã đánh dấu cần kiểm tra' : ''}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <main className={`max-w-3xl mx-auto px-4 pt-4 space-y-3 ${selected.size ? 'pb-56' : 'pb-app'}`}>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Kho tồn</h1>
        {state === 'ready' && <p className="text-sm text-slate-600">{total} căn đang chào lâu không cập nhật</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="Không cập nhật quá" value={query.days} onChange={(e) => changeQuery({ days: Number(e.target.value) as StaleQuery['days'] })}>
          {[30, 60, 90].map((days) => <option key={days} value={days}>Quá {days} ngày</option>)}
        </Select>
        <Select aria-label="Khu vực" value={query.zone ?? ''} onChange={(e) => changeQuery({ zone: e.target.value || undefined })}>
          <option value="">Mọi khu vực</option>
          {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </Select>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl text-sm ${message.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
      {renderList()}
      {state === 'ready' && hasMore && <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>}

      {/* Thanh thao tác hàng loạt — dính đáy, nằm trên menu đáy Quản trị (điện thoại) */}
      {selected.size > 0 && (
        <div role="region" aria-label="Thao tác hàng loạt" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:left-60 z-30 bg-white/95 backdrop-blur border-t border-slate-200 p-3 space-y-2">
          <div className="max-w-3xl mx-auto space-y-2">
            {action ? (
              <>
                <p className="text-sm text-slate-800">{ACTION_TEXT[action]} {selected.size} căn?{action === 'DELETE' ? ' Admin khôi phục được trong 30 ngày.' : ''}</p>
                {action === 'UPCOMING' && (
                  <label className="block text-sm text-slate-700">
                    Ngày dự kiến trống
                    <input type="date" required value={availableDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAvailableDate(e.target.value)} className={`${fieldClass} mt-1`} />
                  </label>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>Hủy</Button>
                  <Button variant={action === 'DELETE' ? 'danger' : 'primary'} loading={busy} disabled={action === 'UPCOMING' && !availableDate} onClick={runBulk}>Xác nhận</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-900">Đã chọn {selected.size} căn{selected.size >= MAX_SELECT ? ' (tối đa)' : ''}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ACTION_TEXT) as Action[]).map((key) => (
                    <Button key={key} size="sm" variant={key === 'DELETE' ? 'danger' : 'outline'} onClick={() => setAction(key)} className="text-xs sm:text-sm">{ACTION_TEXT[key]}</Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
