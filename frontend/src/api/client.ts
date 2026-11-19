import axios from 'axios';
import { clearOfflineData } from '../utils/offlineCache.js';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor tự động gắn Bearer Token vào header nếu có trong localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const redirectToLogin = () => {
  void clearOfflineData(); // Hết phiên → không để dữ liệu Bảng hàng (có SĐT chủ nhà) lại trên máy (Story 9.1)
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

// Các API mà lỗi 401 nghĩa là sai thông tin/hết phiên thật → không thử refresh
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh'];
let refreshPromise: Promise<string> | null = null;

// Access Token hết hạn (1h) → tự gọi /auth/refresh (Refresh Token trong HttpOnly Cookie) rồi gửi lại request.
// Nhiều request cùng lỗi 401 dùng chung 1 lần refresh.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Story 9.1: mất mạng khi lưu / gửi / duyệt → báo rõ thay vì lỗi chung (GET đã có bản lưu offline của Service Worker)
    if (!error.response && !navigator.onLine && original && original.method !== 'get') {
      error.response = { status: 0, data: { message: 'Cần kết nối mạng để thực hiện thao tác này' } };
      return Promise.reject(error);
    }
    // Story 13.2: Admin khóa tài khoản → thoát ngay, xóa dữ liệu trên máy
    if (error.response?.status === 403 && error.response.data?.code === 'ACCOUNT_BLOCKED') {
      redirectToLogin();
      return Promise.reject(error);
    }
    if (error.response?.status !== 401 || !original) return Promise.reject(error);

    if (NO_REFRESH_URLS.includes(original.url) || original._retried) {
      if (original.url !== '/auth/login' && original.url !== '/auth/register') redirectToLogin();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post('/auth/refresh')
          .then((res) => res.data.data.accessToken as string)
          .finally(() => {
            refreshPromise = null;
          });
      }
      const token = await refreshPromise;
      localStorage.setItem('token', token);
      original._retried = true;
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch {
      redirectToLogin();
      return Promise.reject(error);
    }
  }
);

