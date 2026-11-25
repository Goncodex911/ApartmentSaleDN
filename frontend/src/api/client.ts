import axios from 'axios';
import { clearOfflineData } from '../utils/offlineCache.js';

/**
 * Địa chỉ API. Mặc định '/api/v1' = cùng tên miền, đi qua proxy (Netlify _redirects, Vite dev server).
 * VITE_API_URL = địa chỉ đầy đủ của backend (VD https://xxx.onrender.com/api/v1) khi giao diện gọi THẲNG backend
 * (Cloudflare Pages: Cloudflare của Render chặn proxy từ Cloudflare Workers).
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
const DIRECT_API = /^https?:\/\//.test(API_BASE);

/**
 * Gọi thẳng backend khác tên miền thì cookie Refresh Token không dùng được (Safari chặn cookie bên thứ ba)
 * → backend trả Refresh Token trong JSON khi có header X-Token-Transport: body, giao diện lưu ở máy và gửi lại khi gia hạn.
 */
const REFRESH_KEY = 'refreshToken';
const BODY_TOKEN_URLS = ['/auth/refresh', '/auth/logout'];

export const apiClient = axios.create({
  baseURL: API_BASE,
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
    if (DIRECT_API && config.headers) {
      config.headers['X-Token-Transport'] = 'body';
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (refreshToken && BODY_TOKEN_URLS.includes(config.url ?? '')) config.data = { ...(config.data ?? {}), refreshToken };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Lưu Refresh Token mới (đăng nhập, đăng ký, gia hạn, đổi mật khẩu đều xoay vòng token)
apiClient.interceptors.response.use((response) => {
  if (DIRECT_API) {
    const refreshToken = response.data?.data?.refreshToken;
    if (typeof refreshToken === 'string') localStorage.setItem(REFRESH_KEY, refreshToken);
    if (response.config.url === '/auth/logout') localStorage.removeItem(REFRESH_KEY);
  }
  return response;
});

const redirectToLogin = () => {
  void clearOfflineData(); // Hết phiên → không để dữ liệu Bảng hàng (có SĐT chủ nhà) lại trên máy (Story 9.1)
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(REFRESH_KEY);
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

