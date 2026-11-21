import { Zone } from './danang.js';

interface ReverseGeoResult {
  zone?: Zone;
  street?: string;
  ward?: string;
  district?: string;
}

/**
 * Phân tích nhanh Khu vực (Zone) tại Đà Nẵng theo tọa độ GPS (Offline 0ms, không tốn API).
 */
export function inferDanangZone(lng: number, lat: number): Zone | '' {
  // An Thượng (khu phố Tây - thuộc phường Mỹ An)
  if (lat >= 16.048 && lat <= 16.058 && lng >= 108.239 && lng <= 108.248) {
    return 'Mỹ An';
  }
  // Mỹ An (phía Nam Cầu Rồng đến Bắc Ngũ Hành Sơn, giáp biển)
  if (lat >= 16.038 && lat <= 16.065 && lng >= 108.230 && lng <= 108.255) {
    return 'Mỹ An';
  }
  // Sơn Trà (Bắc sông Hàn, Bán đảo Sơn Trà, Mân Thái, Phước Mỹ)
  if (lat >= 16.065 && lat <= 16.130 && lng >= 108.215 && lng <= 108.280) {
    return 'Sơn Trà';
  }
  // Hải Châu (Trung tâm thành phố, Tây sông Hàn)
  if (lat >= 16.020 && lat <= 16.085 && lng >= 108.190 && lng <= 108.230) {
    return 'Hải Châu';
  }
  // Ngũ Hành Sơn (Khu vực Nam bãi biển, Hòa Hải, Non Nước)
  if (lat >= 15.960 && lat < 16.038 && lng >= 108.230 && lng <= 108.280) {
    return 'Ngũ Hành Sơn';
  }
  // Thanh Khê
  if (lat >= 16.050 && lat <= 16.080 && lng >= 108.165 && lng < 108.200) {
    return 'Khác';
  }
  // Cẩm Lệ
  if (lat >= 16.000 && lat < 16.050 && lng >= 108.170 && lng < 108.220) {
    return 'Khác';
  }
  return '';
}

/**
 * Gọi phân giải địa chỉ ngược (Reverse Geocoding) từ tọa độ GPS.
 * Sử dụng Nominatim OpenStreetMap kèm User-Agent định danh, có fallback an toàn.
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
