import { LANDMARKS, DISTRICT_CENTROIDS } from './landmarks.data.js';
import { toSearchTokens, findPhrase } from './text-tokens.js';

export interface IResolvedLocation {
  name: string;
  coordinates: [number, number]; // [lng, lat]
  district?: string;
  category?: string;
}

export class GeocodingService {
  /**
   * Tính khoảng cách đường chim bay giữa 2 điểm GPS theo công thức Haversine (đơn vị: km)
   * Tọa độ chuẩn GeoJSON: [kinh độ, vĩ độ]
   */
  public static haversineDistanceKm(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371; // Bán kính Trái Đất (km)
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Number(distance.toFixed(2));
  }

  /**
   * Phân giải tên điểm mốc / tên quận / chuỗi truy vấn ra tọa độ GPS [lng, lat].
   * `landmarksOnly`: khi TÌM KIẾM chỉ nhận điểm mốc — tên quận đã được lọc theo trường quận,
   * nếu đổi thành "bán kính 2km quanh tâm quận" sẽ bỏ sót căn ở rìa quận hoặc chưa có tọa độ.
   */
  public static resolveCoordinates(queryOrName: string, options: { landmarksOnly?: boolean } = {}): IResolvedLocation | null {
    if (!queryOrName || !queryOrName.trim()) return null;
    const raw = queryOrName.trim();

    // 1. Truyền thẳng tọa độ dạng "lng,lat" hoặc "lat,lng" (Việt Nam: vĩ độ < 30, kinh độ > 100)
    const coordMatch = raw.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const v1 = parseFloat(coordMatch[1]);
      const v2 = parseFloat(coordMatch[3]);
      if (v1 > 100 && v2 < 30) return { name: 'Tọa độ tùy chỉnh', coordinates: [v1, v2] };
      if (v2 > 100 && v1 < 30) return { name: 'Tọa độ tùy chỉnh', coordinates: [v2, v1] };
    }

    // 2. Điểm mốc: khớp mã (id) hoặc khớp NGUYÊN CỤM TỪ của tên/tên ngắn/bí danh
    const tokens = toSearchTokens(raw);
    const landmark =
      LANDMARKS.find((lm) => lm.id === raw.toLowerCase()) ||
      LANDMARKS.find((lm) => [lm.name, lm.shortName, ...lm.aliases].some((phrase) => findPhrase(tokens, phrase)));
    if (landmark) {
      return { name: landmark.shortName, coordinates: landmark.coordinates, district: landmark.district, category: landmark.category };
    }
    if (options.landmarksOnly) return null;

    // 3. Tâm quận (dùng khi gắn tọa độ ước lượng cho căn chỉ có tên quận)
    const district = Object.keys(DISTRICT_CENTROIDS).find((name) => findPhrase(tokens, name));
    return district ? { name: `Quận ${district}`, coordinates: DISTRICT_CENTROIDS[district], district, category: 'AREA' } : null;
  }

  /**
   * Danh sách các điểm mốc phổ biến cho giao diện lựa chọn
   */
  public static getLandmarks(): Array<{
    id: string;
    name: string;
    shortName: string;
    district: string;
    coordinates: [number, number];
    category: string;
  }> {
    return LANDMARKS.map((lm) => ({
      id: lm.id,
      name: lm.name,
      shortName: lm.shortName,
      district: lm.district,
      coordinates: lm.coordinates,
      category: lm.category,
    }));
  }
}

