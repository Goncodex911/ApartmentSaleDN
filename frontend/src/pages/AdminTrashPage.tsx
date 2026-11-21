import React, { useState } from 'react';
import { RotateCcw, Trash2, WifiOff } from 'lucide-react';
import { TrashItem, adminApi } from '../api/adminApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { formatVnd, timeAgo } from '../utils/format.js';

/** 1 căn trong Thùng rác — Khôi phục (1 chạm) / Xóa vĩnh viễn (xác nhận tại chỗ, ghi rõ không hoàn tác). */
const TrashRow: React.FC<{ item: TrashItem; onDone: (message: string) => void }> = ({ item, onDone }) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'restore' | 'purge' | ''>('');
  const [error, setError] = useState('');

  const run = async (kind: 'restore' | 'purge') => {
    setBusy(kind);
    setError('');
    try {
      await (kind === 'restore' ? adminApi.restoreApartment(item._id) : adminApi.purgeApartment(item._id));
      onDone(kind === 'restore' ? `Đã khôi phục: ${item.title}` : `Đã xóa vĩnh viễn: ${item.title}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thực hiện được, vui lòng thử lại');
      setBusy('');
    }
  };

  return (
    <li className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{item.title}</p>
          <p className="text-sm text-slate-600">{formatVnd(item.price)} · {item.location.zone || item.location.district || 'Chưa rõ khu vực'}</p>
          <p className="text-xs text-slate-600">Xóa {timeAgo(item.deletedAt)}{item.deletedBy ? ` bởi ${item.deletedBy.name}` : ''}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${item.daysLeft <= 3 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
          Còn {item.daysLeft} ngày
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 min-w-[12rem] text-sm text-slate-800">Xóa vĩnh viễn căn này và ảnh của căn? Không thể hoàn tác.</span>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={!!busy}>Hủy</Button>
          <Button size="sm" variant="danger" loading={busy === 'purge'} onClick={() => run('purge')}>Xóa vĩnh viễn</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={RotateCcw} loading={busy === 'restore'} onClick={() => run('restore')}>Khôi phục</Button>
          <Button size="sm" variant="outline" icon={Trash2} onClick={() => setConfirming(true)} disabled={!!busy}>Xóa vĩnh viễn</Button>
        </div>
      )}
    </li>
  );
};

/** [ADMIN] Story 16.7: Thùng rác — căn đã xóa giữ 30 ngày rồi tự xóa vĩnh viễn (kèm dọn ảnh Cloudinary). */
export const AdminTrashPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = usePagedList('trash', '', (page) => adminApi.listTrash(page));

  const renderList = () => {
    if (state === 'loading') return <div className="space-y-2" aria-busy="true" aria-label="Đang tải Thùng rác">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
    if (state === 'error') return <EmptyState icon={WifiOff} title="Không tải được Thùng rác" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    if (!items.length) return <EmptyState icon={Trash2} title="Thùng rác trống" description="Căn bị xóa sẽ nằm ở đây 30 ngày trước khi xóa hẳn." />;
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <TrashRow key={item._id} item={item} onDone={(text) => { setMessage(text); reload(); }} />
        ))}
      </ul>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Thùng rác</h1>
        {state === 'ready' && <p className="text-sm text-slate-600">{total} căn</p>}
      </div>
      <p className="text-sm text-slate-600">Căn đã xóa không hiện ở Bảng hàng, tìm kiếm, bản đồ hay link gửi khách. Khôi phục đưa căn về đúng trạng thái trước khi xóa.</p>
      {message && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-sm text-emerald-800">{message}</p>}
      {renderList()}
      {state === 'ready' && hasMore && <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>}
    </main>
  );
};
