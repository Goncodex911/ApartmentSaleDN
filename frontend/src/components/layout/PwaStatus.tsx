import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff } from 'lucide-react';

const useOnline = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
};

const CHECK_UPDATE_MS = 60 * 60 * 1000;

/**
 * Story 9.1: thanh "đang xem ngoại tuyến" + thanh "có phiên bản mới".
 * Bản mới không tự tải lại (registerType: prompt) → người dùng đang nhập form không mất dữ liệu.
 */
export const PwaStatus: React.FC = () => {
  const online = useOnline();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // App mở cả ngày không tải lại trang → tự kiểm tra bản mới mỗi giờ
    onRegisteredSW: (_url, registration) => registration && setInterval(() => registration.update(), CHECK_UPDATE_MS),
  });

  if (online && !needRefresh) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 flex flex-col items-center gap-2 px-4 pointer-events-none" role="status">
      {!online && (
        <p className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow">
          <WifiOff className="w-3.5 h-3.5" aria-hidden />
          Đang xem dữ liệu ngoại tuyến
        </p>
      )}
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="pointer-events-auto flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-lg"
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
          Đã có phiên bản mới — Tải lại
        </button>
      )}
    </div>
  );
};
