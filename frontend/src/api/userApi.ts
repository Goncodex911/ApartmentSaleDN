import { apiClient } from './client.js';
import { User } from './authApi.js';

export type AdminUser = Pick<User, '_id' | 'name' | 'phone' | 'role' | 'ctvCode' | 'status'> & { createdAt: string; trustScore?: number; canReport?: boolean };
export interface UserListParams {
  status?: User['status'];
  role?: User['role'];
  search?: string;
  page?: number;
}

export const userApi = {
  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const res = await apiClient.get('/users/profile');
    return res.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; data: User }> => {
    const res = await apiClient.put('/users/profile', data);
    return res.data;
  },

  // Tạo deep link liên kết Telegram (mã dùng 1 lần, hết hạn 10 phút) — Story 6.2
  createTelegramLink: async (): Promise<{ deepLink: string; code: string; expiresAt: string }> => {
    const res = await apiClient.post('/users/telegram-link');
    return res.data.data;
  },

  unlinkTelegram: async () => {
    await apiClient.delete('/users/telegram-link');
  },

  // [Quản lý] CTV đang hoạt động — ô "CTV chốt căn" khi ghi hợp đồng (Story 11.5)
  listCollaborators: async (): Promise<Pick<User, '_id' | 'name' | 'ctvCode'>[]> => {
    const res = await apiClient.get('/users/collaborators');
    return res.data.data;
  },

  // [ADMIN] Danh sách thành viên: lọc trạng thái / vai trò, tìm tên – SĐT – mã CTV (Story 13.2)
  listUsers: async (params: UserListParams): Promise<{ items: AdminUser[]; total: number }> => {
    const res = await apiClient.get('/users', { params });
    return { items: res.data.data, total: res.data.meta.total };
  },

  // [ADMIN] Duyệt (ACTIVE) hoặc khóa (BLOCKED) tài khoản
  updateUserStatus: async (userId: string, status: 'ACTIVE' | 'BLOCKED'): Promise<AdminUser> => {
    const res = await apiClient.patch(`/users/${userId}/status`, { status });
    return res.data.data;
  },

  // [ADMIN] Quản lý ↔ CTV (Story 13.2)
  updateUserRole: async (userId: string, role: 'MANAGER' | 'COLLABORATOR'): Promise<AdminUser> => {
    const res = await apiClient.patch(`/users/${userId}/role`, { role });
    return res.data.data;
  },

  // [ADMIN] Khóa / mở quyền báo lỗi tin (Story 13.6)
  setCanReport: async (userId: string, canReport: boolean): Promise<AdminUser> => (await apiClient.patch(`/users/${userId}/can-report`, { canReport })).data.data,

  // [ADMIN] Mật khẩu tạm — chỉ trả về 1 lần (Story 13.2)
  resetUserPassword: async (userId: string): Promise<string> => {
    const res = await apiClient.post(`/users/${userId}/reset-password`);
    return res.data.data.tempPassword;
  },

  getPublicCtv: async (ctvCode: string): Promise<{ success: boolean; data: Partial<User> }> => {
    const res = await apiClient.get(`/users/ctv/${ctvCode}`);
    return res.data;
  },
};

