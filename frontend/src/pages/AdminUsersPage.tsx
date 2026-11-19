import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronRight, Users, WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { AdminUser } from '../api/userApi.js';
import { USER_TABS, useAdminUsers } from '../hooks/useAdminUsers.js';
import { UserActionSheet } from '../components/admin/UserActionSheet.js';
import { UserBadges } from '../components/admin/UserBadges.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { AdminFilterTabs, AdminSearch } from '../components/admin/AdminListControls.js';

/**
 * [ADMIN] Quản lý thành viên (Story 13.2): lọc theo tab, tìm tên / SĐT / mã CTV, chạm 1 dòng để duyệt,
 * đổi vai trò, khóa hoặc đặt lại mật khẩu.
 */
export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useApp();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const { items, total, state, loadingMore, hasMore, loadMore, replace, reload } = useAdminUsers(tab, search);

  if (currentUser && currentUser.role !== 'ADMIN') return <Navigate to="/apartments" replace />;

  const renderList = () => {
    if (state === 'loading') {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải thành viên">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
        </div>
      );
    }
    if (state === 'error') {
      return <EmptyState icon={WifiOff} title="Không tải được danh sách" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    }
    if (items.length === 0) {
      return <EmptyState icon={Users} title="Không có thành viên phù hợp" description={search ? 'Thử tìm bằng tên khác, SĐT hoặc mã CTV.' : 'Chưa có ai trong mục này.'} />;
    }
    return (
      <ul className="space-y-2">
        {items.map((user) => (
          <li key={user._id}>
            <button
              type="button"
              onClick={() => setSelected(user)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 text-left cursor-pointer hover:border-slate-300 transition-colors"
            >
              <span className="flex-1 min-w-0 space-y-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-900 truncate">{user.name}</span>
                  <UserBadges user={user} />
                </span>
                <span className="block text-sm text-slate-600 truncate">
                  {user.phone} · {user.ctvCode} · {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Thành viên</h1>
        {state === 'ready' && <span className="text-sm text-slate-600">{total} người</span>}
      </div>

      <AdminSearch value={search} onChange={setSearch} placeholder="Tên, SĐT hoặc mã CTV" />
      <AdminFilterTabs tabs={USER_TABS} value={tab} onChange={setTab} label="Lọc thành viên" />

      {renderList()}
      {state === 'ready' && hasMore && (
        <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>
      )}

      {selected && (
        <UserActionSheet
          user={selected}
          currentUserId={currentUser?._id}
          onChanged={(user) => {
            replace(user);
            setSelected(user);
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
};
