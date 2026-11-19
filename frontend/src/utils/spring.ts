/**
 * Lò xo giảm chấn tới hạn (damping 1, không nảy quá đà) chạy bằng requestAnimationFrame — Story 12.3.
 * Theo nguyên tắc Apple: luôn chạy TỪ vị trí đang hiện trên màn hình và nhận vận tốc thả tay (px/ms)
 * → không có "đường nối" giữa lúc kéo và lúc tự chạy. Trả về hàm huỷ để có thể chụp lại giữa chừng.
 */
export function animateSpring(
  from: number,
  to: number,
  velocity: number,
  onUpdate: (value: number) => void,
  onDone?: () => void,
  responseSec = 0.35
): () => void {
  const stiffness = (2 * Math.PI / responseSec) ** 2; // Apple "response" → độ cứng
  const damping = 2 * Math.sqrt(stiffness); // damping ratio = 1
  let x = from;
  let v = velocity * 1000; // px/ms → px/s
  let last = performance.now();
  let frame = 0;

  const step = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000); // Kẹp bước thời gian khi tab bị treo
    last = now;
    v += (-stiffness * (x - to) - damping * v) * dt;
    x += v * dt;
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 20) {
      onUpdate(to);
      onDone?.();
      return;
    }
    onUpdate(x);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

/** Kéo quá biên → đi chậm dần như dây chun (công thức Apple), không dừng cứng. */
export const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
