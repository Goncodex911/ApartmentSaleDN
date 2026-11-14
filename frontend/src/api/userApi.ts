import { apiClient } from './client.js';
import { User } from './authApi.js';

export const userApi = {
  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const res = await apiClient.get('/users/profile');
    return res.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; data: User }> => {
    const res = await apiClient.put('/users/profile', data);
    return res.data;
  },

  // [ADMIN] Danh sách tài khoản theo trạng thái (mặc định: chờ duyệt)
  listUsers: async (status: User['status'] = 'PENDING'): Promise<User[]> => {
    const res = await apiClient.get('/users', { params: { status } });
    return res.data.data;
  },

  // [ADMIN] Duyệt (ACTIVE) hoặc từ chối/khóa (BLOCKED) tài khoản
  updateUserStatus: async (userId: string, status: 'ACTIVE' | 'BLOCKED') => {
    const res = await apiClient.patch(`/users/${userId}/status`, { status });
    return res.data;
  },

  getPublicCtv: async (ctvCode: string): Promise<{ success: boolean; data: Partial<User> }> => {
    const res = await apiClient.get(`/users/ctv/${ctvCode}`);
    return res.data;
  },
};

