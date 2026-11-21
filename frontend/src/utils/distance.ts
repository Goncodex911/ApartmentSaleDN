/** Khoảng cách gọn cho người đọc: < 1km làm tròn 50m ("~450m"), từ 1km lấy 1 số lẻ ("~1.2km") — Story 15.4 / 15.5. */
export const formatDistance = (meters: number) =>
  meters < 1000 ? `~${Math.round(meters / 50) * 50}m` : `~${(meters / 1000).toFixed(1).replace('.0', '')}km`;

// Tọa độ bãi tắm Mỹ Khê trung tâm (Đà Nẵng)
export const MY_KHE_BEACH_COORDS: [number, number] = [108.2435, 16.0600];

/**
 * Tính khoảng cách (mét) giữa 2 điểm GeoJSON [longitude, latitude] theo công thức Haversine.
 */
export function getDistanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Tính khoảng cách đi bộ ra bãi tắm Mỹ Khê
 */
export function getWalkingDistanceToBeach(coords?: [number, number]): { meters: number; text: string; walkMins: number } | null {
  if (!coords || coords.length !== 2) return null;
  const meters = getDistanceMeters(coords, MY_KHE_BEACH_COORDS);
  const walkMins = Math.max(1, Math.round(meters / 80)); // 80 mét/phút đi bộ thong thả
  return {
    meters,
    text: formatDistance(meters),
    walkMins,
  };
}
