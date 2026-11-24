import { useCallback, useEffect, useRef, useState } from 'react';
import { telegramUserbotApi, ScrapeTask } from '../api/telegramUserbotApi.js';

const POLL_MS = 3000; // Mỗi lượt hỏi đi qua proxy Netlify (tính credit) → 3 giây là đủ mượt
const MAX_NETWORK_RETRIES = 5;

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

/**
 * Theo dõi tác vụ cào tin chạy nền trên máy chủ: hỏi tiến trình mỗi 3 giây (thay vì giữ 1 request dài bị Netlify cắt 504).
 * Mở lại trang / điện thoại khóa màn hình rồi mở lại → tự nhận lại tác vụ đang chạy.
 */
export function useScrapeTask() {
  const [task, setTask] = useState<ScrapeTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  const stopPolling = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const poll = useCallback((taskId: string, delay = POLL_MS) => {
    stopPolling();
    timerRef.current = setTimeout(async () => {
      try {
        const next = await telegramUserbotApi.getScrapeTask(taskId);
        failuresRef.current = 0;
        setTask(next);
        if (next.status === 'RUNNING') poll(taskId);
        else if (next.status === 'FAILED') setError(next.error || 'Lỗi trong quá trình cào tin');
      } catch (err: any) {
        // Mạng điện thoại chập chờn → thử lại vài lần; 404 = máy chủ khởi động lại, tác vụ đã mất
        if (err?.response?.status !== 404 && ++failuresRef.current < MAX_NETWORK_RETRIES) return poll(taskId, POLL_MS * 1.5);
        setError(errorMessage(err, 'Mất kết nối tới máy chủ khi theo dõi tiến trình'));
        setTask((prev) => (prev ? { ...prev, status: 'FAILED' } : prev));
      }
    }, delay);
  }, []);

  // Nhận lại tác vụ đang chạy khi mở trang
  useEffect(() => {
    telegramUserbotApi
      .getActiveScrape()
      .then((active) => {
        if (!active) return;
        setTask(active);
        poll(active.id, 0);
      })
      .catch(() => undefined);
    return stopPolling;
  }, [poll]);

  const start = async (payload: { chat: string; targetSender: string; limit: number }) => {
    setStarting(true);
    setError(null);
    try {
      const taskId = await telegramUserbotApi.startScrape(payload);
      setTask({ id: taskId, status: 'RUNNING', percent: 0, entries: [], apartments: [], stopRequested: false });
      poll(taskId, 800);
    } catch (err) {
      setError(errorMessage(err, 'Không khởi chạy được tác vụ cào tin'));
    } finally {
      setStarting(false);
    }
  };

  const cancel = async () => {
    if (!task) return;
    try {
      setTask(await telegramUserbotApi.cancelScrape(task.id));
    } catch (err) {
      setError(errorMessage(err, 'Không dừng được tác vụ'));
    }
  };

  return { task, error, starting, isRunning: task?.status === 'RUNNING', start, cancel };
}
