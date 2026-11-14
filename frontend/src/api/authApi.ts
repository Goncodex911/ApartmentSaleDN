import { apiClient } from './client.js';

export interface User {
  _id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'COLLABORATOR';
  ctvCode: string;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  zaloPhone?: string;
  zaloLink?: string;
  avatarUrl?: string;
  greetingMessage?: string;
  telegramChatId?: string; // Có giá trị = đã liên kết Telegram nhận thông báo (Story 6.2)
}

export const authApi = {
  login: async (credentials: { phone: string; password: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },

  register: async (data: {
    name: string;
    phone: string;
    password: string;
    role: 'MANAGER' | 'COLLABORATOR';
  }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return res.data;
  },
};

