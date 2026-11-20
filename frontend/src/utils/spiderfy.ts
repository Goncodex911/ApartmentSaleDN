/**
 * Vị trí tản ghim quanh điểm gốc (Story 15.2), đơn vị pixel màn hình — hàm thuần, không phụ thuộc Leaflet.
 * Bong bóng giá là hình chữ nhật rộng (~64 × 28px) nên không dùng bán kính cố định: tự nới cho tới khi không đè nhau.
 * ≤ 6 căn: chia đều trên 1 vòng elip (giãn ngang), bắt đầu hướng 12 giờ. 7–20 căn: đi dọc xoắn ốc, chỉ đặt vào chỗ trống.
 */
const PILL_W = 70; // Bề rộng bong bóng + khe hở
const PILL_H = 32;
const X_STRETCH = 1.9;

type Point = { x: number; y: number };
const clashes = (a: Point, b: Point) => Math.abs(a.x - b.x) < PILL_W && Math.abs(a.y - b.y) < PILL_H;
const fits = (p: Point, placed: Point[]) => placed.every((q) => !clashes(p, q));
const at = (radius: number, angle: number): Point => ({ x: Math.round(radius * Math.cos(angle) * X_STRETCH), y: Math.round(radius * Math.sin(angle)) });

export function spiderfyOffsets(count: number): Point[] {
  if (count <= 6) {
    for (let radius = 34; ; radius += 4) {
      const ring = Array.from({ length: count }, (_, i) => at(radius, -Math.PI / 2 + (2 * Math.PI * i) / count));
      if (ring.every((p, i) => fits(p, ring.slice(0, i)))) return ring;
    }
  }
  const placed: Point[] = [];
  for (let t = 0; placed.length < count; t += 0.05) {
    const p = at(30 + 7 * t, -Math.PI / 2 + t); // Xoắn ốc Archimedes: bán kính tăng đều theo góc
    if (fits(p, placed) && Math.hypot(p.x, p.y) >= 30) placed.push(p);
  }
  return placed;
}
