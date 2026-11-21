import { apiClient } from './client.js';
import { User } from './authApi.js';

export type AdminUser = Pick<User, '_id' | 'name' | 'phone' | 'role' | 'ctvCode' | 'status'> & { createdAt: string; trustScore?: number; canReport?: boolean; lastActiveAt?: string };

// Story 16.4 — phiên đăng nhập theo thiết bị (id là mã băm, không phải mã phiên thật)
export type DeviceSession = { id: string; userAgent: string; ip: string; createdAt: string | null; lastUsedAt: string | null; current: boolean };

// Story 16.6
export type UserFormInput = { name: string; phone: string; email?: string };
export type AdminNote = { _id: string; text: string; authorId: string; authorName: string; createdAt: string };

// Story 16.3 — Hồ sơ 360° (khách CRM chỉ có số lượng theo giai đoạn)
export interface UserOverview {
  user: AdminUser & { email?: string; lastLoginAt?: string; telegramLinked: boolean; activeSessions: number };
  stats: {
    apartmentsCreated: number;
    apartmentsUpdated: number;
    submissions: Record<string, number>;
    reviewed: Record<string, number>;
    shareLinks: number;
    shareViews: number;
    leadsByStage: Record<string, number>;
    deals: number;
    reports: Record<string, number>;
    contactViews: number;
  };
}
export interface UserListParams {
  status?: User['status'];
  role?: User['role'];
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'lastActive' | 'inactive'; // Story 16.3
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

  // [ADMIN] Story 16.3: Hồ sơ 360°
  getOverview: async (userId: string, range: '30d' | 'all'): Promise<UserOverview> => (await apiClient.get(`/users/${userId}/overview`, { params: { range } })).data.data,

  // [ADMIN] Story 16.6: tạo tài khoản (mật khẩu tạm trả đúng 1 lần), sửa thông tin, ghi chú nội bộ
  createUser: async (data: UserFormInput & { role: 'MANAGER' | 'COLLABORATOR' }): Promise<{ user: AdminUser; tempPassword: string }> => (await apiClient.post('/users', data)).data.data,
  updateUser: async (userId: string, data: Partial<UserFormInput>): Promise<AdminUser> => (await apiClient.patch(`/users/${userId}`, data)).data.data,
  listNotes: async (userId: string): Promise<AdminNote[]> => (await apiClient.get(`/users/${userId}/notes`)).data.data,
  addNote: async (userId: string, text: string): Promise<AdminNote[]> => (await apiClient.post(`/users/${userId}/notes`, { text })).data.data,
  deleteNote: async (userId: string, noteId: string): Promise<AdminNote[]> => (await apiClient.delete(`/users/${userId}/notes/${noteId}`)).data.data,

  // Story 16.4: không truyền userId = thiết bị của chính mình
  listSessions: async (userId?: string): Promise<DeviceSession[]> => (await apiClient.get(`/users/${userId ?? 'me'}/sessions`)).data.data,
  revokeSession: async (sessionId: string, userId?: string) => apiClient.delete(`/users/${userId ?? 'me'}/sessions/${sessionId}`),
  revokeAllSessions: async (userId: string) => apiClient.delete(`/users/${userId}/sessions`),

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

