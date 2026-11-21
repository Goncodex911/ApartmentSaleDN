import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, LogOut, ShieldCheck, WifiOff } from 'lucide-react';
import { AlertRule, SecurityAlert, adminApi } from '../api/adminApi.js';
import { userApi } from '../api/userApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { AdminFilterTabs } from '../components/admin/AdminListControls.js';
import { notifyAlertsChanged } from '../components/admin/adminNav.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { timeAgo } from '../utils/format.js';

const RULE_LABEL: Record<AlertRule, string> = {
  OWNER_CONTACT_SCRAPE: 'Xem SĐT chủ bất thường',
  LOGIN_BRUTE_FORCE: 'Dò mật khẩu',
  MASS_DELETE: 'Xóa nhiều căn',
  NEW_DEVICE_PRIVILEGED: 'Thiết bị mới',
};
const TABS = [
  { id: 'open', label: 'Chưa xử lý' },
  { id: 'resolved', label: 'Đã xử lý' },
];
type Pending = { alert: SecurityAlert; action: 'block' | 'logoutAll' };

/** Story 16.5: 1 cảnh báo — mức độ, mô tả, thời điểm, link hồ sơ / nhật ký, thao tác nhanh (có xác nhận tại chỗ). */
const AlertCard: React.FC<{ alert: SecurityAlert; onResolved: () => void }> = ({ alert, onResolved }) => {
  const [pending, setPending] = useState<Pending['action'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const run = async (task: () => Promise<unknown>, doneText: string, resolveAfter = false) => {
    setBusy(true);
    setError('');
    try {
      await task();
      setDone(doneText);
      setPending(null);
      if (resolveAfter) onResolved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thực hiện được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const confirmText = pending === 'block' ? `Khóa tài khoản ${alert.subject}? Người này bị đăng xuất ngay.` : `Đăng xuất ${alert.subject} khỏi mọi thiết bị?`;
  return (
    <li className={`p-4 rounded-2xl bg-white border space-y-2 ${alert.severity === 'SECURITY' && !alert.resolvedAt ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap gap-1.5">
          <Badge tone={alert.severity === 'SECURITY' ? 'danger' : 'gold'}>{alert.severity === 'SECURITY' ? 'Bảo mật' : 'Quan trọng'}</Badge>
          <Badge tone="neutral">{RULE_LABEL[alert.rule]}</Badge>
        </span>
        <time dateTime={alert.updatedAt} className="text-xs text-slate-600">{timeAgo(alert.updatedAt)}</time>
      </div>
      <p className="text-sm font-medium text-slate-900">{alert.message}</p>
      {alert.userId && (
        <p className="flex flex-wrap gap-x-4 text-sm">
          <Link to={`/admin/users/${alert.userId}`} className="inline-flex items-center min-h-[44px] font-semibold text-indigo-700 hover:underline">Hồ sơ {alert.subject}</Link>
          <Link to={`/admin/audit-logs?userId=${alert.userId}&range=today`} className="inline-flex items-center min-h-[44px] font-semibold text-indigo-700 hover:underline">Nhật ký hôm nay</Link>
        </p>
      )}
      {alert.resolvedAt && <p className="text-xs text-slate-600">Đã xử lý {timeAgo(alert.resolvedAt)}{alert.resolvedBy ? ` bởi ${alert.resolvedBy.name}` : ''}</p>}
      {done && <p role="status" className="text-sm text-emerald-800">{done}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

      {!alert.resolvedAt && (pending ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="flex-1 min-w-[12rem] text-sm text-slate-800">{confirmText}</span>
          <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>Hủy</Button>
          <Button size="sm" variant="danger" loading={busy}
            onClick={() => pending === 'block'
              ? run(() => userApi.updateUserStatus(alert.userId!, 'BLOCKED'), 'Đã khóa tài khoản')
              : run(() => userApi.revokeAllSessions(alert.userId!), 'Đã đăng xuất mọi thiết bị')}>
            Xác nhận
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" icon={Check} loading={busy} onClick={() => run(() => adminApi.resolveAlert(alert._id), 'Đã đánh dấu xử lý', true)}>Đã xử lý</Button>
          {alert.userId && (
            <>
              <Button size="sm" variant="outline" icon={LogOut} onClick={() => setPending('logoutAll')}>Đăng xuất mọi thiết bị</Button>
              <Button size="sm" variant="outline" icon={Lock} onClick={() => setPending('block')}>Khóa tài khoản</Button>
            </>
          )}
        </div>
      ))}
    </li>
  );
};

/** [ADMIN] Story 16.5: cảnh báo bảo mật & hành vi bất thường — Chưa xử lý / Đã xử lý. */
export const AdminAlertsPage: React.FC = () => {
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = usePagedList(status, '', (page) => adminApi.listAlerts({ status, page }));

  const renderList = () => {
    if (state === 'loading') return <div className="space-y-2" aria-busy="true" aria-label="Đang tải cảnh báo">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>;
    if (state === 'error') return <EmptyState icon={WifiOff} title="Không tải được cảnh báo" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    if (!items.length) {
      return <EmptyState icon={ShieldCheck} title={status === 'open' ? 'Chưa có cảnh báo nào — hệ thống bình thường' : 'Chưa có cảnh báo đã xử lý'} />;
    }
    return (
      <ul className="space-y-2">
        {items.map((alert) => (
          <AlertCard key={alert._id} alert={alert} onResolved={() => { reload(); notifyAlertsChanged(); }} />
        ))}
      </ul>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cảnh báo bảo mật</h1>
        {state === 'ready' && <p className="text-sm text-slate-600">{total} cảnh báo</p>}
      </div>
      <p className="text-sm text-slate-600">Ngưỡng phát hiện chỉnh trong Cấu hình. Cùng 1 người, cùng 1 loại chỉ tạo 1 cảnh báo mỗi giờ.</p>
      <AdminFilterTabs tabs={TABS} value={status} onChange={(id) => setStatus(id as typeof status)} label="Trạng thái cảnh báo" />
      {renderList()}
      {state === 'ready' && hasMore && <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>}
    </main>
  );
};
