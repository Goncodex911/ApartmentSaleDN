import { decodePlusCode, resolveMapCoordinates } from '../../utils/google-maps.js';
import { normalizeText } from '../../utils/address-text.js';
import { outcomeOf, record } from '../health/service-health.js';
import { inDanang } from './landmarks.data.js';
import { throttled } from './street-geocoder.js';

export interface GeoPlace {
  label: string;
  detail?: string;
  coordinates: [number, number]; // [kinh độ, vĩ độ]
  source: 'OSM' | 'GOOGLE_LINK' | 'PLUS_CODE';
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DANANG_VIEWBOX = '107.90,16.25,108.40,15.80';
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(?:\s|$)/i;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 300;
const BUSY = { status: 503, message: 'Dịch vụ bản đồ đang bận, thử lại sau vài giây' };

// Cache trong bộ nhớ: nhiều người hay tìm cùng tên đường / tòa → không gọi lại Nominatim (chính sách bắt buộc cache)
const cache = new Map<string, { at: number; places: GeoPlace[] }>();

async function askNominatim(query: string): Promise<GeoPlace[]> {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', countrycodes: 'vn', viewbox: DANANG_VIEWBOX, bounded: '1' });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'RoomMaster-Danang/1.0', 'Accept-Language': 'vi' },
      signal: AbortSignal.timeout(4000),
    });
    record('nominatim', outcomeOf(res.status), res.ok ? undefined : `HTTP ${res.status}`);
    if (!res.ok) throw BUSY;
    const hits = (await res.json()) as { name?: string; display_name: string; lon: string; lat: string }[];
    return hits
      .map((hit) => {
        const [first, ...rest] = hit.display_name.split(', ');
        return {
          label: hit.name || first,
          detail: rest.filter((part) => part !== 'Việt Nam' && !/^\d+$/.test(part)).slice(0, 3).join(', ') || undefined,
          coordinates: [Number(Number(hit.lon).toFixed(6)), Number(Number(hit.lat).toFixed(6))] as [number, number],
          source: 'OSM' as const,
        };
      })
      .filter((place) => inDanang(place.coordinates));
  } catch (err) {
    if (err === BUSY) throw err;
    record('nominatim', 'error', 'Mất kết nối / quá 4 giây');
    throw BUSY;
  }
}

/**
 * Story 20.4: ô tìm trên bản đồ "Đặt vị trí chính xác". Kết quả CHỈ để di chuyển bản đồ — vị trí lưu vẫn là ghim người dùng xác nhận.
 * - Link Google Maps → giải mã (chính xác tới nóc nhà);
 * - Plus Code ("36FF+WH Đà Nẵng") → giải mã tại chỗ;
 * - Chữ → OSM Nominatim qua hàng đợi chung 1 req/s. Chính sách Nominatim CẤM gợi ý theo từng phím → client chỉ gọi khi bấm Tìm.
 */
export async function searchPlaces(query: string): Promise<GeoPlace[]> {
  const text = query.trim();
  if (/^https?:\/\//i.test(text)) {
    const coordinates = await resolveMapCoordinates(text);
    return coordinates ? [{ label: 'Vị trí theo link Google Maps', coordinates, source: 'GOOGLE_LINK' }] : [];
  }
  if (PLUS_CODE.test(text)) {
    const coordinates = decodePlusCode(text);
    return coordinates && inDanang(coordinates) ? [{ label: `Plus Code ${text.split(/\s/)[0].toUpperCase()}`, coordinates, source: 'PLUS_CODE' }] : [];
  }

  const key = normalizeText(text);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.places;
  const places = await throttled(() => askNominatim(`${text}, Đà Nẵng`));
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!); // Bỏ mục cũ nhất
  cache.set(key, { at: Date.now(), places });
  return places;
}
