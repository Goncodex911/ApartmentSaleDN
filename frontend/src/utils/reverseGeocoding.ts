import { Zone } from './danang.js';

interface ReverseGeoResult {
  zone?: Zone;
  street?: string;
  ward?: string;
  district?: string;
}

// [vĩ độ min, vĩ độ max, kinh độ min, kinh độ max] — ô gần đúng, thứ tự kiểm tra = ưu tiên (phường nhỏ trước, phần còn lại của quận sau)
type Box = [number, number, number, number];
const HAN_RIVER_EAST = 108.226; // Bờ Đông sông Hàn (Sơn Trà / An Hải) — bờ Tây (Thuận Phước, Hải Châu) không thuộc Sơn Trà
const ZONE_BOXES: [Zone, Box][] = [
  ['Mỹ An', [16.038, 16.058, 108.236, 108.255]], // gồm khu phố Tây An Thượng
  ['Khuê Mỹ', [16.012, 16.038, 108.236, 108.26]],
  ['Ngũ Hành Sơn', [15.96, 16.04, 108.23, 108.29]], // phần còn lại: Hòa Hải, Non Nước
  ['An Hải', [16.058, 16.078, HAN_RIVER_EAST, 108.252]],
  ['Sơn Trà', [16.058, 16.15, HAN_RIVER_EAST, 108.33]], // phần còn lại: Phước Mỹ, Mân Thái, bán đảo
  ['Hòa Xuân', [15.99, 16.025, 108.205, 108.235]],
  ['Hải Châu', [16.025, 16.09, 108.195, HAN_RIVER_EAST]],
  ['Khác', [15.95, 16.15, 108.1, 108.33]], // Thanh Khê, Cẩm Lệ, Liên Chiểu... trong vùng Đà Nẵng
];

/**
 * Khu vực (Zone) Đà Nẵng theo tọa độ GPS — offline, không tốn API. Ranh giới GẦN ĐÚNG để gợi ý,
 * người dùng vẫn sửa được trên form. Story 19.10: đủ 8 khu vực chuẩn (danang.ts), Sơn Trà không lấn bờ Tây sông Hàn.
 */
export function inferDanangZone(lng: number, lat: number): Zone | '' {
  const hit = ZONE_BOXES.find(([, [latMin, latMax, lngMin, lngMax]]) => lat >= latMin && lat < latMax && lng >= lngMin && lng < lngMax);
  return hit ? hit[0] : '';
}

/**
 * Gọi phân giải địa chỉ ngược (Reverse Geocoding) từ tọa độ GPS qua Nominatim OpenStreetMap, có fallback an toàn.
 * (Trình duyệt không cho đặt header User-Agent — Nominatim nhận diện qua Referer của trang.)
 */
export async function reverseGeocodeDanang(lng: number, lat: number): Promise<ReverseGeoResult> {
  const result: ReverseGeoResult = {
    zone: inferDanangZone(lng, lat) || undefined,
  };

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return result;
    const data = await res.json();
    const addr = data.address || {};

    const street = addr.road || addr.pedestrian || addr.suburb || '';
    const ward = addr.quarter || addr.neighbourhood || addr.suburb || '';
    const district = addr.city_district || addr.district || addr.suburb || '';

    if (street) result.street = street.replace(/^Đường\s+/i, '');
    if (ward) result.ward = ward.replace(/^Phường\s+/i, '');
    if (district) result.district = district.replace(/^Quận\s+/i, '');
  } catch {
    // Timeout hoặc mạng chậm: vẫn giữ zone nội bộ đã tính toán
  }

  return result;
}
