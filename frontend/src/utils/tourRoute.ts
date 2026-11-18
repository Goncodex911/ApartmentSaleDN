// Lập lộ trình dẫn khách (Story 11.3) — toạ độ [kinh độ, vĩ độ] như trong DB
export type LngLat = [number, number];

export const MAX_TOUR_STOPS = 4; // Google Maps trên trình duyệt điện thoại chỉ nhận 3 điểm dừng giữa đường + 1 điểm đích
const ROAD_FACTOR = 1.3; // Đường thực tế dài hơn đường chim bay ~30%
const MOTORBIKE_KMH = 25;
const VIEWING_MINUTES = 20;

/** Khoảng cách đường chim bay (km) theo công thức haversine. */
export function haversineKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * Xếp thứ tự "điểm gần nhất tiếp theo" (Nearest Neighbor): từ vị trí CTV (hoặc căn đầu tiên nếu không có GPS)
 * luôn đi tới căn chưa xem gần nhất. Đủ tốt với ≤ 4 căn, không cần gọi API chỉ đường.
 */
export function orderNearestNeighbor<T extends { coordinates: LngLat }>(start: LngLat | null, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current = start ?? remaining[0]?.coordinates;
  while (remaining.length) {
    let bestIndex = 0;
    remaining.forEach((stop, index) => {
      if (haversineKm(current!, stop.coordinates) < haversineKm(current!, remaining[bestIndex].coordinates)) bestIndex = index;
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next.coordinates;
  }
  return ordered;
}

const latLngText = ([lng, lat]: LngLat) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

/**
 * Link Google Maps chỉ đường xe máy qua các căn theo thứ tự. Không có vị trí CTV → bỏ origin
 * (Google Maps tự dùng vị trí hiện tại hoặc hỏi người dùng); căn cuối là điểm đích, các căn trước là điểm dừng.
 */
export function buildGoogleMapsDirUrl(origin: LngLat | null, stops: LngLat[]): string {
  const params = new URLSearchParams({ api: '1' });
  if (origin) params.set('origin', latLngText(origin));
  params.set('destination', latLngText(stops[stops.length - 1]));
  if (stops.length > 1) params.set('waypoints', stops.slice(0, -1).map(latLngText).join('|'));
  params.set('travelmode', 'two-wheeler');
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Phút đi xe máy ước tính cho đoạn đường chim bay `km` (0 km = đang đứng tại căn → 0 phút, còn lại tối thiểu 3 phút). */
export const rideMinutes = (km: number) => (km === 0 ? 0 : Math.max(3, Math.round(((km * ROAD_FACTOR) / MOTORBIKE_KMH) * 60)));

/** Giờ hẹn gợi ý từng căn: giờ bắt đầu + thời gian đi + 20 phút xem mỗi căn trước đó. */
export function suggestTimes(start: Date, legKm: number[]): Date[] {
  let time = start.getTime();
  return legKm.map((km, index) => {
    time += (index === 0 ? 0 : VIEWING_MINUTES * 60_000) + rideMinutes(km) * 60_000;
    return new Date(time);
  });
}

/** Giờ hiện tại làm tròn lên mốc 15 phút gần nhất (giờ bắt đầu mặc định). */
export function roundUpQuarter(now = new Date()): Date {
  const date = new Date(now);
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
  return date;
}
