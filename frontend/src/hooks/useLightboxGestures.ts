import React, { useCallback, useRef } from 'react';
import { animateSpring, prefersReducedMotion, rubberband } from '../utils/spring.js';

const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_MS = 300;
const SWIPE_VELOCITY = 0.4; // px/ms — vuốt nhanh là chuyển ảnh dù chưa kéo quá nửa
const DISMISS_DISTANCE = 120;

type Point = { x: number; y: number };
interface GestureOptions {
  count: number;
  index: number;
  setIndex: (index: number) => void;
  onClose: () => void;
  trackRef: React.RefObject<HTMLElement>; // Dải ảnh nằm ngang (dịch theo index)
  stageRef: React.RefObject<HTMLElement>; // Khung toàn màn hình (vuốt dọc xuống để đóng)
  zoomTarget: () => HTMLElement | null; // Ảnh đang xem
}

/**
 * Cử chỉ trình xem ảnh (Story 12.4), tự viết bằng Pointer Events (touch-action: none — trình duyệt không tranh cử chỉ):
 * 1 ngón ở 1× = vuốt ngang chuyển ảnh / vuốt dọc xuống để đóng; 2 ngón = phóng to quanh điểm giữa 2 ngón (1–3×);
 * đã phóng to thì 1 ngón kéo để di chuyển ảnh; chạm 2 lần = phóng 2× tại điểm chạm / thu về.
 */
export function useLightboxGestures({ count, index, setIndex, onClose, trackRef, stageRef, zoomTarget }: GestureOptions) {
  const pointers = useRef(new Map<number, Point>());
  const zoom = useRef({ scale: 1, x: 0, y: 0 });
  const gesture = useRef<{ mode: 'swipe' | 'dismiss' | 'pan' | 'pinch' | null; start: Point; startZoom: typeof zoom.current; startDist: number; history: { t: number; x: number; y: number }[] }>({
    mode: null, start: { x: 0, y: 0 }, startZoom: { scale: 1, x: 0, y: 0 }, startDist: 0, history: [],
  });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const trackOffset = useRef(0);
  const cancelSpring = useRef<() => void>(() => undefined);

  const width = () => stageRef.current?.clientWidth || window.innerWidth;
  const setTrack = (offset: number) => {
    trackOffset.current = offset;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-index * width() + offset}px, 0, 0)`;
  };
  const setDismiss = (dy: number) => {
    if (!stageRef.current) return;
    stageRef.current.style.transform = `translate3d(0, ${dy}px, 0)`;
    stageRef.current.style.backgroundColor = `rgba(0,0,0,${0.95 * Math.max(0.3, 1 - dy / 400)})`;
  };
  // Giữ ảnh phóng to không lọt khỏi khung: dịch tối đa (scale - 1) * nửa kích thước khung
  const clampPan = (scale: number, x: number, y: number) => {
    const maxX = ((scale - 1) * width()) / 2;
    const maxY = ((scale - 1) * (stageRef.current?.clientHeight || window.innerHeight)) / 2;
    return { scale, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };
  const applyZoom = (next: typeof zoom.current, animate = false) => {
    zoom.current = next;
    const el = zoomTarget();
    if (!el) return;
    el.style.transition = animate && !prefersReducedMotion() ? 'transform 250ms cubic-bezier(0.2, 0, 0, 1)' : 'none';
    el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
  };
  // Không phụ thuộc gì: applyZoom chỉ đọc ref và zoomTarget (nơi dùng truyền hàm đọc ref)
  const resetZoom = useCallback((animate = false) => applyZoom({ scale: 1, x: 0, y: 0 }, animate), []);

  /** Chuyển tới ảnh `next` (giữ vận tốc thả tay) — dùng cho vuốt, dải ảnh nhỏ, phím mũi tên. */
  const goTo = useCallback(
    (next: number, velocity = 0) => {
      const target = Math.max(0, Math.min(count - 1, next));
      cancelSpring.current();
      const fromPx = -index * width() + trackOffset.current;
      const toPx = -target * width();
      resetZoom();
      setIndex(target);
      trackOffset.current = 0;
      if (prefersReducedMotion() || !trackRef.current) return void (trackRef.current && (trackRef.current.style.transform = `translate3d(${toPx}px, 0, 0)`));
      cancelSpring.current = animateSpring(fromPx, toPx, velocity, (px) => trackRef.current && (trackRef.current.style.transform = `translate3d(${px}px, 0, 0)`));
    },
    [count, index, setIndex, resetZoom, trackRef]
  );

  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const center = () => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, video')) return; // Link, thanh điều khiển video giữ hành vi gốc
    // Chưa "bắt" con trỏ ở đây: chạm thường vẫn ra click cho nút (VD Phát video); chỉ bắt khi đã là kéo / phóng to
    cancelSpring.current();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    g.startZoom = { ...zoom.current };
    if (pts.length === 2) {
      [...pointers.current.keys()].forEach((id) => e.currentTarget.setPointerCapture(id)); // 2 ngón = chắc chắn là phóng to
      g.mode = 'pinch';
      g.startDist = distance(pts[0], pts[1]);
      g.start = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    } else {
      g.mode = null; // Chờ hướng kéo đầu tiên mới quyết định vuốt ngang / dọc / di chuyển ảnh
      g.start = { x: e.clientX, y: e.clientY };
      g.history = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (g.mode === 'pinch' && pts.length === 2) {
      // Phóng to quanh điểm giữa 2 ngón: điểm đó đứng yên dưới ngón tay
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const raw = (g.startZoom.scale * distance(pts[0], pts[1])) / g.startDist;
      const scale = raw > MAX_SCALE ? MAX_SCALE + rubberband(raw - MAX_SCALE, 1, 0.3) : Math.max(0.8, raw);
      const c = center();
      const ratio = scale / g.startZoom.scale;
      const x = mid.x - c.x - (g.start.x - c.x - g.startZoom.x) * ratio;
      const y = mid.y - c.y - (g.start.y - c.y - g.startZoom.y) * ratio;
      return applyZoom({ scale, x, y });
    }
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    const now = performance.now();
    g.history = [...g.history, { t: now, x: e.clientX, y: e.clientY }].filter((p) => now - p.t < 100);
    if (!g.mode) {
      if (Math.hypot(dx, dy) < 8) return; // Ngưỡng ~8px trước khi chọn hướng (tránh rung tay)
      g.mode = zoom.current.scale > 1 ? 'pan' : Math.abs(dy) > Math.abs(dx) && dy > 0 ? 'dismiss' : 'swipe';
      e.currentTarget.setPointerCapture(e.pointerId); // Đã là kéo → giữ con trỏ dù ngón tay ra ngoài ảnh
    }
    if (g.mode === 'pan') return applyZoom(clampPan(g.startZoom.scale, g.startZoom.x + dx, g.startZoom.y + dy));
    if (g.mode === 'dismiss') return setDismiss(Math.max(0, dy));
    // Ảnh đầu / cuối: kéo quá biên đi chậm dần như dây chun
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    setTrack(atEdge ? Math.sign(dx) * rubberband(Math.abs(dx), width()) : dx);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    const [first, last] = [g.history[0], g.history[g.history.length - 1]];
    const vx = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const vy = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;

    // Nhấc ngón cuối sau khi phóng / di chuyển: đưa mức phóng về 1–3× và giữ ảnh trong khung (có hiệu ứng)
    const settleZoom = () => {
      const scale = Math.min(MAX_SCALE, Math.max(1, zoom.current.scale));
      applyZoom(scale === 1 ? { scale: 1, x: 0, y: 0 } : clampPan(scale, zoom.current.x, zoom.current.y), true);
    };
    if (g.mode === 'pan') return pointers.current.size === 0 && settleZoom();
    if (g.mode === 'pinch') {
      if (pointers.current.size === 1) {
        // Còn 1 ngón → tiếp tục di chuyển ảnh từ đây
        const [rest] = pointers.current.values();
        g.mode = 'pan';
        g.start = rest;
        g.startZoom = { ...zoom.current };
        return;
      }
      return settleZoom();
    }
    if (g.mode === 'swipe') {
      const offset = trackOffset.current;
      const next = Math.abs(offset) > width() / 2 || Math.abs(vx) > SWIPE_VELOCITY ? index - Math.sign(offset || vx) : index;
      return goTo(next, vx);
    }
    if (g.mode === 'dismiss') {
      const dy = e.clientY - g.start.y;
      if (dy > DISMISS_DISTANCE || vy > SWIPE_VELOCITY) return onClose();
      if (stageRef.current) Object.assign(stageRef.current.style, { transition: 'transform 200ms, background-color 200ms' });
      setDismiss(0);
      setTimeout(() => stageRef.current && (stageRef.current.style.transition = ''), 220);
      return;
    }
    if (g.mode === null) {
      // Chạm (không kéo): kiểm tra chạm 2 lần
      const now = performance.now();
      const tap = { t: now, x: e.clientX, y: e.clientY };
      if (now - lastTap.current.t < DOUBLE_TAP_MS && distance(tap, lastTap.current) < 30) {
        lastTap.current = { t: 0, x: 0, y: 0 };
        if (zoom.current.scale > 1) return resetZoom(true);
        const c = center();
        return applyZoom(clampPan(DOUBLE_TAP_SCALE, (c.x - tap.x) * (DOUBLE_TAP_SCALE - 1), (c.y - tap.y) * (DOUBLE_TAP_SCALE - 1)), true);
      }
      lastTap.current = tap;
    }
  };

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }, goTo, resetZoom, isZoomed: () => zoom.current.scale > 1 };
}
