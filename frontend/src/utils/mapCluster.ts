export interface ScreenPoint<T> {
  x: number;
  y: number;
  item: T;
}
export interface PointCluster<T> {
  x: number; // Toạ độ trung bình (pixel) của các điểm trong cụm
  y: number;
  items: T[];
}

/**
 * Gom các ghim gần nhau trên màn hình theo ô lưới pixel (Story 11.2) — thay thư viện markercluster.
 * Hai ghim rơi vào cùng ô cellSize × cellSize thì thành 1 cụm; phóng to → khoảng cách pixel tăng → cụm tự tách.
 */
export function clusterPoints<T>(points: ScreenPoint<T>[], cellSize = 60): PointCluster<T>[] {
  const cells = new Map<string, PointCluster<T>>();
  for (const point of points) {
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const cell = cells.get(key);
    if (!cell) {
      cells.set(key, { x: point.x, y: point.y, items: [point.item] });
      continue;
    }
    const count = cell.items.push(point.item);
    cell.x += (point.x - cell.x) / count; // Trung bình cộng dồn
    cell.y += (point.y - cell.y) / count;
  }
  return [...cells.values()];
}
