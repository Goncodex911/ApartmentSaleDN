import React, { useCallback, useEffect, useRef } from 'react';
import { animateSpring, prefersReducedMotion, rubberband } from '../utils/spring.js';

const DISMISS_FRACTION = 0.3; // Kéo xuống quá 30% chiều cao đang hiện → đóng
const FLICK_VELOCITY = 0.5; // px/ms — vuốt nhanh xuống → đóng dù chưa đủ 30%
const PROJECTION_MS = 200; // Dự đoán điểm dừng theo quán tính khi thả tay
const VELOCITY_WINDOW_MS = 100;

interface SheetDragOptions {
  sheetRef: React.RefObject<HTMLElement>;
  overlayRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLElement>;
  snapPoints?: number[]; // Tỉ lệ chiều cao màn hình, VD [0.5, 0.9]; không có = cao vừa nội dung
  enabled: boolean; // false trên máy tính (hộp thoại giữa màn hình, không kéo)
  expanded?: boolean; // true → trượt lên nấc cao nhất (Story 14.8)
  onClose: () => void;
}

/**
 * Kéo bảng trượt (Story 12.3): bám tay 1:1 từ đúng điểm chạm, dây chun khi kéo quá nấc cao nhất,
 * thả tay → giữ vận tốc + chọn nấc gần điểm dừng dự đoán, đủ ngưỡng thì trượt xuống đóng.
 * Mọi chuyển động chạy từ vị trí đang hiện (chụp lại giữa chừng được). Đặt transform trực tiếp, không render lại React.
 */
export function useSheetDrag({ sheetRef, overlayRef, contentRef, snapPoints, enabled, expanded, onClose }: SheetDragOptions) {
  const y = useRef(0);
  const cancelAnim = useRef<() => void>(() => undefined);
  const closing = useRef(false);
  const drag = useRef<{ startY: number; startTranslate: number; history: { t: number; y: number }[] } | null>(null);
  // Giữ trong ref: nơi dùng hay truyền mảng / hàm viết thẳng (mới mỗi lần render) → các hàm bên dưới vẫn ổn định
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const snapRef = useRef(snapPoints);
  snapRef.current = snapPoints;

  const height = () => sheetRef.current?.offsetHeight || window.innerHeight;
  // Vị trí translateY của từng nấc (0 = cao nhất có thể); không có nấc → chỉ 1 vị trí 0
  const snaps = useCallback(() => {
    const h = height();
    return (snapRef.current || [h / window.innerHeight]).map((p) => Math.max(0, h - p * window.innerHeight)).sort((a, b) => a - b);
  }, []);

  const apply = useCallback((value: number) => {
    y.current = value;
    const h = height();
    const top = snaps()[0];
    if (sheetRef.current) sheetRef.current.style.transform = `translate3d(0, ${value}px, 0)`;
    if (overlayRef.current) overlayRef.current.style.opacity = String(Math.min(1, Math.max(0, 1 - (value - top) / (h - top || 1))));
  }, [snaps, sheetRef, overlayRef]);

  const moveTo = useCallback((target: number, velocity = 0, done?: () => void) => {
    cancelAnim.current();
    if (prefersReducedMotion()) {
      apply(target);
      done?.();
      return;
    }
    cancelAnim.current = animateSpring(y.current, target, velocity, apply, done);
  }, [apply]);

  const dismiss = useCallback((velocity = 0) => {
    if (closing.current) return;
    closing.current = true;
    if (!enabled) return onCloseRef.current();
    if (prefersReducedMotion()) {
      // Giảm chuyển động: mờ dần thay vì trượt
      [sheetRef.current, overlayRef.current].forEach((el) => el && Object.assign(el.style, { transition: 'opacity 150ms', opacity: '0' }));
      setTimeout(() => onCloseRef.current(), 150);
      return;
    }
    moveTo(height(), Math.max(velocity, 0), () => onCloseRef.current());
  }, [enabled, moveTo, sheetRef, overlayRef]);

  // Mở: trượt từ dưới lên nấc đầu tiên (nấc thấp nhất)
  useEffect(() => {
    if (!enabled) return;
    const list = snaps();
    apply(height());
    moveTo(list[list.length - 1]);
    return () => cancelAnim.current();
  }, [enabled]); // Chỉ chạy khi mở

  const begin = (clientY: number) => {
    cancelAnim.current(); // Chụp lại giữa chừng: dừng lò xo, kéo tiếp từ vị trí đang hiện
    drag.current = { startY: clientY, startTranslate: y.current, history: [{ t: performance.now(), y: clientY }] };
  };
  const move = (clientY: number) => {
    const state = drag.current;
    if (!state) return;
    const top = snaps()[0];
    let next = state.startTranslate + clientY - state.startY;
    if (next < top) next = top - rubberband(top - next, window.innerHeight);
    apply(next);
    const now = performance.now();
    state.history = [...state.history, { t: now, y: clientY }].filter((p) => now - p.t <= VELOCITY_WINDOW_MS);
  };
  const end = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    const [first, last] = [state.history[0], state.history[state.history.length - 1]];
    const velocity = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
    const list = snaps();
    const lowest = list[list.length - 1];
    const projected = y.current + velocity * PROJECTION_MS;
    if (y.current - lowest > DISMISS_FRACTION * (height() - lowest) || (velocity > FLICK_VELOCITY && projected > lowest)) {
      return dismiss(velocity);
    }
    const target = list.reduce((best, snap) => (Math.abs(snap - projected) < Math.abs(best - projected) ? snap : best), list[0]);
    moveTo(target, velocity);
  };

  // Story 14.8: nội dung cần thêm chỗ (VD bấm giai đoạn cần nhập thông tin) → trượt lên nấc cao nhất bằng lò xo, không nhảy cứng
  useEffect(() => {
    if (enabled && expanded && !closing.current) moveTo(snaps()[0]);
  }, [enabled, expanded]); // Chỉ chạy khi chuyển sang trạng thái mở rộng

  // Kéo từ vùng nội dung: chỉ khi nội dung đã cuộn lên đầu mà vẫn kéo xuống (không tranh với cuộn)
  useEffect(() => {
    const content = contentRef.current;
    if (!enabled || !content) return;
    let startY = 0;
    const onStart = (e: TouchEvent) => (startY = e.touches[0].clientY);
    const onMove = (e: TouchEvent) => {
      const clientY = e.touches[0].clientY;
      if (!drag.current && content.scrollTop <= 0 && clientY - startY > 4) begin(clientY);
      if (drag.current) {
        e.preventDefault();
        move(clientY);
      }
    };
    content.addEventListener('touchstart', onStart, { passive: true });
    content.addEventListener('touchmove', onMove, { passive: false });
    content.addEventListener('touchend', end);
    content.addEventListener('touchcancel', end);
    return () => {
      content.removeEventListener('touchstart', onStart);
      content.removeEventListener('touchmove', onMove);
      content.removeEventListener('touchend', end);
      content.removeEventListener('touchcancel', end);
    };
  }, [enabled]); // begin / move / end chỉ đọc ref → không cần gắn lại mỗi lần render

  // Thanh kéo + tiêu đề: Pointer Events (chuột & cảm ứng), giữ con trỏ khi ra ngoài vùng
  const handleProps = enabled
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if ((e.target as HTMLElement).closest('button, a, input')) return; // Bấm nút trên tiêu đề vẫn là bấm
          e.currentTarget.setPointerCapture(e.pointerId);
          begin(e.clientY);
        },
        onPointerMove: (e: React.PointerEvent) => move(e.clientY),
        onPointerUp: end,
        onPointerCancel: end,
      }
    : {};

  return { handleProps, dismiss };
}
