import { useEffect, useState } from 'react';
import { isStandalone } from '../utils/device.js';

const THRESHOLD = 70; // Kéo quá 70px rồi thả → tải lại
const MAX_PULL = 110;
const SPIN_MS = 800;

// Đang mở form / hộp thoại / bảng trượt (đều là lớp phủ fixed inset-0) → không kéo-làm-mới
const hasOverlay = () => !!document.querySelector('.fixed.inset-0');

/**
 * Kéo xuống ở đầu trang để tải lại (Story 9.4). Chỉ bật khi chạy dạng app đã cài:
 * trong trình duyệt, Chrome Android đã có kéo-làm-mới riêng → tránh tải 2 lần.
 * `force` = bật cả trong trình duyệt (dùng khi kiểm thử).
 */
export function usePullToRefresh(onRefresh: () => void, force = false) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!force && !isStandalone()) return;
    let startY: number | null = null;
    let distance = 0;

    const onStart = (e: TouchEvent) => {
      startY = window.scrollY <= 0 && !hasOverlay() ? e.touches[0].clientY : null;
      distance = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      distance = Math.max(0, Math.min(MAX_PULL, (e.touches[0].clientY - startY) * 0.6)); // 0.6: cảm giác kéo nặng tay như app
      setPull(distance);
    };
    const onEnd = () => {
      if (startY !== null && distance >= THRESHOLD) {
        setRefreshing(true);
        onRefresh();
        setTimeout(() => setRefreshing(false), SPIN_MS);
      }
      startY = null;
      setPull(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [onRefresh, force]);

  return { pull, refreshing, ready: pull >= THRESHOLD };
}
