import { UserListParams, userApi } from '../api/userApi.js';
import { usePagedList } from './usePagedList.js';

// Các tab lọc của trang Thành viên (Story 13.2)
export const USER_TABS: { id: string; label: string; params: UserListParams }[] = [
  { id: 'all', label: 'Tất cả', params: {} },
  { id: 'pending', label: 'Chờ duyệt', params: { status: 'PENDING' } },
  { id: 'managers', label: 'Quản lý', params: { role: 'MANAGER' } },
  { id: 'ctv', label: 'CTV', params: { role: 'COLLABORATOR' } },
  { id: 'blocked', label: 'Bị khóa', params: { status: 'BLOCKED' } },
];

/** [ADMIN] Danh sách thành viên theo tab + ô tìm (tên, SĐT, mã CTV), 20 người mỗi lần tải. */
export const useAdminUsers = (tabId: string, search: string) =>
  usePagedList(tabId, search, (page, query) => {
    const tab = USER_TABS.find((item) => item.id === tabId) ?? USER_TABS[0];
    return userApi.listUsers({ ...tab.params, search: query || undefined, page });
  });
