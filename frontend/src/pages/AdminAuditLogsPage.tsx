import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ScrollText, WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { adminApi } from '../api/adminApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { AuditLogItem } from '../components/admin/AuditLogItem.js';
import { AdminFilterTabs, AdminSearch } from '../components/admin/AdminListControls.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';

// Tab lọc = 1 hoặc nhiều hành động (gửi lên dạng "A,B")
const ACTION_TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'UNMASK_OWNER_CONTACT', label: 'Xem SĐT chủ' },
  { id: 'CHANGE_STATUS,UPDATE_PRICE', label: 'Trạng thái & giá' },
  { id: 'DELETE_APARTMENT', label: 'Xóa căn' },
  { id: 'APPROVE_SUBMISSION,REJECT_SUBMISSION,DISMISS_REPORT', label: 'Tin đăng & báo lỗi' },
  { id: 'CHANGE_USER_STATUS,CHANGE_ROLE,RESET_PASSWORD,CHANGE_PASSWORD', label: 'Tài khoản' },
];

/** [ADMIN] Nhật ký truy vết (Story 13.3): ai xem SĐT chủ nhà, đổi trạng thái / giá, xóa căn, duyệt tin, thao tác tài khoản. */
export const AdminAuditLogsPage: React.FC = () => {
  const { user: currentUser } = useApp();
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = usePagedList(action, search, (page, query) =>
    adminApi.listAuditLogs({ action: action || undefined, search: query || undefined, page })
  );

  if (currentUser && currentUser.role !== 'ADMIN') return <Navigate to="/apartments" replace />;

  const renderList = () => {
    if (state === 'loading') {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải nhật ký">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      );
    }
    if (state === 'error') {
      return <EmptyState icon={WifiOff} title="Không tải được nhật ký" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    }
    if (items.length === 0) {
      return <EmptyState icon={ScrollText} title="Chưa có nhật ký phù hợp" description={search ? 'Thử tìm bằng tên người khác hoặc tên căn khác.' : 'Thao tác của Quản lý sẽ hiện ở đây.'} />;
    }
    return <ul className="space-y-2">{items.map((log) => <AuditLogItem key={log._id} log={log} />)}</ul>;
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Nhật ký truy vết</h1>
        {state === 'ready' && <span className="text-sm text-slate-600">{total} mục</span>}
      </div>
      <p className="text-sm text-slate-600">Lưu 180 ngày. Mỗi người xem SĐT chủ của 1 căn được ghi tối đa 1 lần / 10 phút.</p>
      <AdminSearch value={search} onChange={setSearch} placeholder="Tên người thực hiện hoặc tên căn" />
      <AdminFilterTabs tabs={ACTION_TABS} value={action} onChange={setAction} label="Lọc hành động" />
      {renderList()}
      {state === 'ready' && hasMore && (
        <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>
      )}
    </main>
  );
};
