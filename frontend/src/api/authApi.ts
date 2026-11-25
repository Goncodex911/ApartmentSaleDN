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
  paymentTerms?: string; // Story 10.4: in vào bài gửi khách
  zaloGroupLink?: string;
  whatsappGroupLink?: string;
  telegramChatId?: string; // Có giá trị = đã liên kết Telegram nhận thông báo (Story 6.2)
  mustChangePassword?: boolean; // Story 13.9: đang dùng mật khẩu tạm Admin cấp
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

  // Story 13.9: đổi mật khẩu — máy chủ cấp token mới cho thiết bị này (thiết bị khác bị đăng xuất)
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<User> => {
    const res = await apiClient.post('/auth/change-password', data);
    localStorage.setItem('token', res.data.data.accessToken);
    return res.data.data.user;
  },

  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken'); // Chỉ có khi gọi thẳng backend (VITE_API_URL)
    return res.data;
  },
};

