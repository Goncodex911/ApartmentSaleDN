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

  getPublicCtv: async (ctvCode: string): Promise<{ success: boolean; data: Partial<User> }> => {
    const res = await apiClient.get(`/users/ctv/${ctvCode}`);
    return res.data;
  },
};

