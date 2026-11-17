/**
 * Link Google Maps của căn (Story 8.3): kiểm tra tên miền và lấy tọa độ.
 * Chống SSRF: server CHỈ gửi request tới tên miền Google Maps trong danh sách trắng, kể cả ở từng bước chuyển hướng.
 */
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

const parseUrl = (raw: string) => {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

export function isGoogleMapsUrl(raw: string): boolean {
  const url = parseUrl(raw);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl' || host === 'maps.google.com' || host === 'maps.google.com.vn') return true;
  if (host === 'goo.gl') return url.pathname.startsWith('/maps');
  return /^(www\.)?google\.com(\.vn)?$/.test(host) && url.pathname.startsWith('/maps');
}

const toCoordinates = (lat: string, lng: string): [number, number] | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return [longitude, latitude]; // GeoJSON: [kinh độ, vĩ độ]
};

/**
 * Lấy tọa độ từ link dài. Ưu tiên "!3d..!4d.." (vị trí ghim), sau đó "@lat,lng" (tâm khung nhìn), cuối cùng "?q=lat,lng".
 */
export function parseCoordinates(raw: string): [number, number] | null {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // Link có ký tự % lỗi → đọc nguyên văn
  }
  const NUM = '(-?\\d{1,3}\\.\\d+)';
  const patterns = [
    new RegExp(`!3d${NUM}!4d${NUM}`),
    new RegExp(`@${NUM},${NUM}`),
    new RegExp(`[?&](?:q|ll|query|destination|center)=${NUM},\\s*${NUM}`),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return toCoordinates(match[1], match[2]);
  }
  return null;
}

/**
 * Tọa độ từ link (dài hoặc rút gọn maps.app.goo.gl). Không lấy được → null (căn vẫn lưu, dùng tọa độ ước lượng).
 * Không đọc nội dung trang, chỉ đọc header Location của từng bước chuyển hướng.
 */
export async function resolveMapCoordinates(raw: string): Promise<[number, number] | null> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const coordinates = parseCoordinates(current);
    if (coordinates) return coordinates;

    // Server đặt ở châu Âu/Mỹ có thể bị chuyển sang trang đồng ý cookie — link thật nằm ở tham số "continue"
    const url = parseUrl(current);
    if (url?.hostname === 'consent.google.com') {
      current = url.searchParams.get('continue') || '';
      continue;
    }
    if (!isGoogleMapsUrl(current) || hop === MAX_REDIRECTS) return null;

    try {
      const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) return null;
      current = new URL(location, current).toString();
    } catch {
      return null; // Mạng lỗi / quá 5 giây
    }
  }
  return null;
}
