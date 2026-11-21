/**
 * Bộ giải mã link Google Maps & Plus Code (Story 17.5 / Epic 17).
 * Hỗ trợ bóc tách tọa độ từ link rút gọn di động (maps.app.goo.gl), link desktop (goo.gl/maps),
 * link place dài (!3d..!4d..), link search query, và mã Plus Code.
 * Chống SSRF: chỉ gửi request tới whitelist domain của Google, timeout 5s, không gọi API tính phí.
 */

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 5000;

// Giới hạn địa lý khu vực Đà Nẵng và vùng lân cận
export const DANANG_GEO_BOUNDS = {
  minLat: 15.80,
  maxLat: 16.30,
  minLng: 107.85,
  maxLng: 108.45,
};

export function isValidDanangCoordinates(lng: number, lat: number): boolean {
  return (
    lat >= DANANG_GEO_BOUNDS.minLat &&
    lat <= DANANG_GEO_BOUNDS.maxLat &&
    lng >= DANANG_GEO_BOUNDS.minLng &&
    lng <= DANANG_GEO_BOUNDS.maxLng
  );
}

const parseUrl = (raw: string): URL | null => {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

/**
 * Kiểm tra domain hợp lệ của Google Maps & chống SSRF.
 */
export function isGoogleMapsUrl(raw: string): boolean {
  const url = parseUrl(raw);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl' || host === 'maps.google.com' || host === 'maps.google.com.vn') return true;
  if (host === 'goo.gl') return url.pathname.startsWith('/maps');
  return /^(www\.)?google\.com(\.vn)?$/.test(host) && url.pathname.startsWith('/maps');
}

const toCoordinates = (latStr: string, lngStr: string): [number, number] | null => {
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // Chuẩn hóa 6 chữ số thập phân (độ chính xác ~0.1m)
  const lat = Number(latitude.toFixed(6));
  const lng = Number(longitude.toFixed(6));
  return [lng, lat]; // GeoJSON: [kinh độ, vĩ độ]
};

const OLC_ALPHABET = '23456789CFGHJMPQRVWX';
const DANANG_OLC_PREFIX = '7P8C'; // Tiền tố OLC chuẩn cho khu vực Đà Nẵng

/**
 * Giải mã mã định vị mở Plus Code (Open Location Code) thuần JS không phụ thuộc thư viện ngoài.
 */
export function decodePlusCode(code: string): [number, number] | null {
  let cleaned = code.trim().toUpperCase().replace(/%2B/g, '+');
  const plusIdx = cleaned.indexOf('+');
  if (plusIdx === -1) return null;

  // Nếu là mã ngắn (4 hoặc 6 ký tự trước dấu +), ghép tiền tố Đà Nẵng
  if (plusIdx === 4) cleaned = DANANG_OLC_PREFIX + cleaned;
  else if (plusIdx === 6) cleaned = DANANG_OLC_PREFIX.slice(0, 2) + cleaned;

  const digits = cleaned.replace('+', '').slice(0, 10);
  if (digits.length < 8) return null;
  for (const c of digits) {
    if (!OLC_ALPHABET.includes(c)) return null;
  }

  let lat = -90;
  let lng = -180;
  const steps = [20, 1, 0.05, 0.0025, 0.000125];

  for (let i = 0; i < digits.length; i += 2) {
    const idx = i / 2;
    if (idx >= steps.length) break;
    lat += OLC_ALPHABET.indexOf(digits[i]) * steps[idx];
    lng += OLC_ALPHABET.indexOf(digits[i + 1]) * steps[idx];
  }

  const lastStep = steps[Math.min(Math.floor(digits.length / 2) - 1, steps.length - 1)];
  lat += lastStep / 2;
  lng += lastStep / 2;

  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

/**
 * Bóc tách tọa độ từ URL text.
 * Thứ tự ưu tiên:
 * 1. "!3d..!4d.." (Tọa độ chính xác của ghim tòa nhà)
 * 2. "@lat,lng" (Tâm khung nhìn bản đồ)
 * 3. Tham số truy vấn: "?q=lat,lng" / "query=" / "destination=" / "center=" / "ll=" / "daddr="
 * 4. Đường dẫn trực tiếp: "/place/lat,lng" hoặc "/search/lat,lng"
 * 5. Mã Plus Code trong đường dẫn hoặc tham số "?q=..."
 */
export function parseCoordinates(raw: string): [number, number] | null {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // Ký tự % không hợp lệ → dùng nguyên bản
  }

  const NUM = '(-?\\d{1,3}\\.\\d+)';

  // 1. Cặp !3d và !4d (vị trí ghim tòa nhà)
  const pinMatch = text.match(new RegExp(`!3d${NUM}!4d${NUM}`));
  if (pinMatch) return toCoordinates(pinMatch[1], pinMatch[2]);

  // 2. Viewport @lat,lng
  const atMatch = text.match(new RegExp(`@${NUM},${NUM}`));
  if (atMatch) return toCoordinates(atMatch[1], atMatch[2]);

  // 3. Query params: q, ll, query, destination, center, daddr
  const queryMatch = text.match(new RegExp(`[?&](?:q|ll|query|destination|center|daddr)=${NUM},\\s*${NUM}`));
  if (queryMatch) return toCoordinates(queryMatch[1], queryMatch[2]);

  // 4. Đường dẫn /place/lat,lng hoặc /search/lat,lng
  const pathMatch = text.match(new RegExp(`/(?:place|search)/${NUM},[+]?${NUM}`));
  if (pathMatch) return toCoordinates(pathMatch[1], pathMatch[2]);

  // 5. Plus code (e.g. 7P8C36FF+WH hoặc 36FF+WH)
  const plusMatch = text.match(/(?:place\/|q=)?([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})/i);
  if (plusMatch) {
    const coords = decodePlusCode(plusMatch[1]);
    if (coords) return coords;
  }

  return null;
}

/**
 * Giải mã tọa độ từ link Google Maps bất kỳ (kể cả link rút gọn maps.app.goo.gl).
 * Theo dõi chuỗi redirect HTTP location tối đa 5 bước.
 * Tọa độ hợp lệ phải nằm trong khu vực Đà Nẵng (hoặc trả về null nếu ngoài địa giới).
 */
export async function resolveMapCoordinates(raw: string): Promise<[number, number] | null> {
  let current = raw;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const coordinates = parseCoordinates(current);
    if (coordinates) {
      // Kiểm tra có nằm trong Đà Nẵng không
      if (isValidDanangCoordinates(coordinates[0], coordinates[1])) {
        return coordinates;
      }
      return null; // Tọa độ ngoại tỉnh hoặc ngoài vùng hợp lệ
    }

    // Bypass trang Cookie Consent của Google
    const url = parseUrl(current);
    if (url?.hostname === 'consent.google.com') {
      current = url.searchParams.get('continue') || '';
      continue;
    }

    if (!isGoogleMapsUrl(current) || hop === MAX_REDIRECTS) return null;

    try {
      const response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // Nếu HEAD bị 405 Method Not Allowed thì fallback GET
      let location = response.headers.get('location');
      if (!location && response.status === 405) {
        const getRes = await fetch(current, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        await getRes.body?.cancel();
        location = getRes.headers.get('location');
      } else {
        await response.body?.cancel();
      }

      if (!location) return null;
      current = new URL(location, current).toString();
    } catch {
      return null; // Quá thời gian timeout hoặc lỗi mạng
    }
  }

  return null;
}
