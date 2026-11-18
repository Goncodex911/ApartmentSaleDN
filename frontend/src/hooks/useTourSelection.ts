import { useCallback, useEffect, useState } from 'react';
import { MAX_TOUR_STOPS } from '../utils/tourRoute.js';

export interface TourPick {
  id: string;
  label: string; // Giá / tên ngắn hiện trên thanh nổi
}
const STORAGE_KEY = 'tour.selection';

const readPicks = (): TourPick[] => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.slice(0, MAX_TOUR_STOPS) : [];
  } catch {
    return [];
  }
};

/**
 * Các căn CTV chọn cho chuyến dẫn khách (Story 11.3) — giữ khi gạt Danh sách ↔ Bản đồ / đổi trang (sessionStorage).
 * Tối đa 4 căn (giới hạn điểm dừng của Google Maps trên trình duyệt điện thoại).
 */
export function useTourSelection() {
  const [picks, setPicks] = useState<TourPick[]>(readPicks);
  const [active, setActive] = useState(() => readPicks().length > 0);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      /* Trình duyệt chặn lưu trữ → chỉ giữ trong lần mở này */
    }
  }, [picks]);

  const isPicked = useCallback((id: string) => picks.some((pick) => pick.id === id), [picks]);

  /** Tích / bỏ tích; trả false khi đã đủ 4 căn (để báo người dùng). */
  const toggle = useCallback(
    (pick: TourPick) => {
      if (picks.some((item) => item.id === pick.id)) {
        setPicks(picks.filter((item) => item.id !== pick.id));
        return true;
      }
      if (picks.length >= MAX_TOUR_STOPS) return false;
      setPicks([...picks, pick]);
      setActive(true);
      return true;
    },
    [picks]
  );

  const cancel = useCallback(() => {
    setPicks([]);
    setActive(false);
  }, []);

  return { picks, active, setActive, isPicked, toggle, cancel };
}
