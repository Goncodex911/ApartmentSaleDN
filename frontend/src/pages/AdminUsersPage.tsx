import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, UserPlus, Users, WifiOff } from 'lucide-react';
import { UserListParams } from '../api/userApi.js';
import { USER_TABS, useAdminUsers } from '../hooks/useAdminUsers.js';
import { UserBadges } from '../components/admin/UserBadges.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Select } from '../components/ui/Input.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { AdminFilterTabs, AdminSearch } from '../components/admin/AdminListControls.js';
import { activityText, isOnline } from '../components/admin/userActivity.js';
import { UserFormSheet } from '../components/admin/UserFormSheet.js';

type Sort = NonNullable<UserListParams['sort']>;
const SORTS: { id: Sort; label: string }[] = [
  { id: 'newest', label: 'Mới tham gia' },
  { id: 'lastActive', label: 'Hoạt động gần nhất' },
  { id: 'inactive', label: 'Lâu không hoạt động' },
];

/**
 * [ADMIN] Quản lý thành viên (Story 13.2): lọc theo tab, tìm tên / SĐT / mã CTV, sắp theo hoạt động cuối (16.3).
 * Chạm 1 người → Hồ sơ 360° (mọi thao tác duyệt / đổi vai trò / khóa / đặt lại mật khẩu nằm ở đó).
 * Tab / ô tìm / sắp xếp lưu trên URL → quay lại từ hồ sơ giữ nguyên.
 */
export const AdminUsersPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const sort = (params.get('sort') || 'newest') as Sort;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [creating, setCreating] = useState(false);
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = useAdminUsers(tab, search, sort);
  const update = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true }
    );

  const renderList = () => {
    if (state === 'loading') {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải thành viên">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)}
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
        {items.map((user) => {
          const online = isOnline(user.lastActiveAt);
          return (
            <li key={user._id}>
              <Link
                to={`/admin/users/${user._id}`}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 text-left cursor-pointer hover:border-slate-300 active:bg-slate-50 transition-colors"
              >
                <span className="flex-1 min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-slate-900 truncate">{user.name}</span>
                    <UserBadges user={user} />
                  </span>
                  <span className="block text-sm text-slate-600 truncate">
                    {user.phone} · {user.ctvCode} · Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs ${online ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
                    {online && <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />}
                    {activityText(user.lastActiveAt)}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Thành viên</h1>
          {state === 'ready' && <p className="text-sm text-slate-600">{total} người</p>}
        </div>
        <Button icon={UserPlus} onClick={() => setCreating(true)}>Thêm thành viên</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            update('q', value.trim());
          }}
          placeholder="Tên, SĐT hoặc mã CTV"
        />
        <Select aria-label="Sắp xếp" value={sort} onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value)}>
          {SORTS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </Select>
      </div>
      <AdminFilterTabs tabs={USER_TABS} value={tab} onChange={(id) => update('tab', id === 'all' ? '' : id)} label="Lọc thành viên" />

      {renderList()}
      {state === 'ready' && hasMore && (
        <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>
      )}
      {creating && <UserFormSheet mode="create" onDone={reload} onClose={() => setCreating(false)} />}
    </main>
  );
};
