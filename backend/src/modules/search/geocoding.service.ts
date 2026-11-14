import { HANOI_LANDMARKS, HANOI_DISTRICT_CENTROIDS } from './landmarks.data.js';

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
   * Phân giải tên điểm mốc hoặc chuỗi truy vấn ra tọa độ GPS [lng, lat]
   */
  public static resolveCoordinates(queryOrName: string): IResolvedLocation | null {
    if (!queryOrName || !queryOrName.trim()) return null;

    const raw = queryOrName.trim();

    // 1. Kiểm tra nếu truyền thẳng tọa độ dạng "lng,lat" hoặc "lat,lng"
    const coordMatch = raw.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const v1 = parseFloat(coordMatch[1]);
      const v2 = parseFloat(coordMatch[3]);
      // Hà Nội có vĩ độ ~20.9-21.2 và kinh độ ~105.6-106.0
      if (v1 > 100 && v2 < 30) {
        return { name: 'Tọa độ tùy chỉnh', coordinates: [v1, v2] };
      } else if (v2 > 100 && v1 < 30) {
        return { name: 'Tọa độ tùy chỉnh', coordinates: [v2, v1] };
      }
    }

    const normalized = this.normalizeText(raw);

    // 2. Tra cứu trong bảng điểm mốc Hà Nội đã định nghĩa
    for (const lm of HANOI_LANDMARKS) {
      if (lm.id === raw.toLowerCase()) {
        return {
          name: lm.shortName,
          coordinates: lm.coordinates,
          district: lm.district,
          category: lm.category,
        };
      }

      const matchName = this.normalizeText(lm.name);
      const matchShort = this.normalizeText(lm.shortName);
      if (normalized.includes(matchName) || normalized.includes(matchShort)) {
        return {
          name: lm.shortName,
          coordinates: lm.coordinates,
          district: lm.district,
          category: lm.category,
        };
      }

      // Kiểm tra aliases
      const aliasMatch = lm.aliases.some((alias) => {
        const normAlias = this.normalizeText(alias);
        return normalized.includes(normAlias);
      });

      if (aliasMatch) {
        return {
          name: lm.shortName,
          coordinates: lm.coordinates,
          district: lm.district,
          category: lm.category,
        };
      }
    }

    // 3. Tra cứu theo tâm quận nếu người dùng chỉ nhập tên quận
    for (const [district, coords] of Object.entries(HANOI_DISTRICT_CENTROIDS)) {
      if (normalized.includes(this.normalizeText(district))) {
        return {
          name: `Quận ${district}`,
          coordinates: coords,
          district,
          category: 'AREA',
        };
      }
    }

    return null;
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
    return HANOI_LANDMARKS.map((lm) => ({
      id: lm.id,
      name: lm.name,
      shortName: lm.shortName,
      district: lm.district,
      coordinates: lm.coordinates,
      category: lm.category,
    }));
  }

  /**
   * Chuẩn hóa tiếng Việt không dấu, loại bỏ ký tự đặc biệt
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

