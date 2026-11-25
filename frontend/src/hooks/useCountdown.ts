import { useEffect, useState } from 'react';

/** Số giây còn lại tới mốc `untilMs` (0 khi đã qua / không có mốc). Dùng cho nút "Gửi lại sau 0:45", khóa FLOOD_WAIT, hạn QR. */
export function useCountdown(untilMs: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!untilMs || untilMs <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [untilMs]);
  return untilMs ? Math.max(0, Math.ceil((untilMs - now) / 1000)) : 0;
}

export const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
