import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, authApi } from '../api/authApi.js';

// localStorage có thể bị chặn (ẩn danh, trình duyệt trong Zalo) → bọc try/catch
const readSavedUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};
const saveUser = (user: User) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // Không lưu được thì lần sau mất mạng sẽ phải đăng nhập lại — chấp nhận
  }
};

/**
 * Người dùng đang đăng nhập (Story 9.1). Mất mạng → dùng thông tin đã lưu ở máy để xem kho ngoại tuyến,
 * KHÔNG đá về trang đăng nhập. Hết phiên thật (401) do interceptor trong api/client.ts chuyển về /login.
 */
export function useCurrentUser() {
  const navigate = useNavigate();
  const [user, setUserState] = useState<User | null>(readSavedUser);

  useEffect(() => {
    authApi
      .getMe()
      .then((res) => {
        setUserState(res.data);
        saveUser(res.data);
      })
      .catch((err) => {
        const isOffline = !err.response;
        if (!isOffline || !readSavedUser()) navigate('/login');
      });
  }, [navigate]);

  const setUser = (next: User) => {
    setUserState(next);
    saveUser(next);
  };
  return { user, setUser };
}
