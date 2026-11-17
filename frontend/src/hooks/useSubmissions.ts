import { useCallback, useEffect, useState } from 'react';
import { ListingSubmission, submissionApi } from '../api/submissionApi.js';

// Báo cho số đếm trên thanh menu biết vừa có thay đổi (gửi / duyệt / từ chối / rút tin)
const CHANGED_EVENT = 'submissions:changed';
export const notifySubmissionsChanged = () => window.dispatchEvent(new Event(CHANGED_EVENT));

/**
 * Danh sách tin đăng (Story 8.6): CTV xem tin của mình, Quản lý xem hàng chờ duyệt.
 * `status` rỗng = tất cả trạng thái.
 */
export function useSubmissions(mode: 'mine' | 'review' | null, status: string) {
  const [items, setItems] = useState<ListingSubmission[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!mode) return; // Chưa biết vai trò người dùng
    let cancelled = false;
    const params = { limit: 50, ...(status && { status }) };
    setState('loading');
    (mode === 'mine' ? submissionApi.listMine(params) : submissionApi.list(params))
      .then((res) => !cancelled && (setItems(res.items), setState('ready')))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [mode, status, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
    notifySubmissionsChanged();
  }, []);

  return { items, state, reload };
}

/** Số tin chờ duyệt cho Quản lý: tải lại khi có thay đổi, khi quay lại tab và mỗi 60 giây. */
export function usePendingSubmissionCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => submissionApi.pendingCount().then(setCount).catch(() => undefined);
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener(CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled]);

  return count;
}
