import { Geocache } from './geocache.model.js';
import { canonicalDistrict } from './district.js';
import { streetKey } from '../dedup/street-key.js';
import { inDanang } from './landmarks.data.js';

/**
 * Story 15.6: tọa độ theo TÊN ĐƯỜNG ở Đà Nẵng qua OSM Nominatim (chính sách: ≤ 1 request/giây, User-Agent định danh, bắt buộc cache).
 * Chỉ gửi tên đường + quận + "Đà Nẵng" — không gửi số nhà / thông tin chủ. Lỗi / quá giờ → null (nơi gọi dùng ước lượng cũ).
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DANANG_VIEWBOX = '107.90,16.25,108.40,15.80'; // trái, trên, phải, dưới — gồm cả Hội An
const DAY_MS = 24 * 60 * 60 * 1000;
const FOUND_TTL_MS = 180 * DAY_MS;
const MISS_TTL_MS = 7 * DAY_MS;
const GAP_MS = 1000;
const TIMEOUT_MS = 4000;

// Hàng đợi tuần tự cho cả máy chủ: request sau chạy sau request trước + 1 giây
let queue: Promise<unknown> = Promise.resolve();
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined).then(() => new Promise((resolve) => setTimeout(resolve, GAP_MS)));
  return run;
}

async function askNominatim(street: string, district?: string): Promise<[number, number] | null | 'error'> {
  const params = new URLSearchParams({
    q: [street, district, 'Đà Nẵng'].filter(Boolean).join(', '),
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'vn',
    viewbox: DANANG_VIEWBOX,
    bounded: '1',
  });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'RoomMaster-Danang/1.0', 'Accept-Language': 'vi' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return 'error'; // 429 / 403 / 5xx: không cache, lần sau thử lại
    const [hit] = (await res.json()) as { lon: string; lat: string }[];
    const coordinates: [number, number] | null = hit ? [Number(Number(hit.lon).toFixed(6)), Number(Number(hit.lat).toFixed(6))] : null;
    return coordinates && inDanang(coordinates) ? coordinates : null;
  } catch {
    return 'error'; // Mất mạng / quá 4 giây
  }
}

export async function geocodeStreet(street?: string | null, district?: string | null): Promise<[number, number] | null> {
  const key = streetKey(street || '');
  if (!key) return null;
  const area = canonicalDistrict(district) || undefined;
  const cacheKey = `${key}|${area || ''}`;

  const cached = await Geocache.findById(cacheKey).lean();
  if (cached) return cached.found && cached.coordinates ? cached.coordinates : null;

  const result = await throttled(() => askNominatim(street!.trim(), area));
  if (result === 'error') return null;
  await Geocache.updateOne(
    { _id: cacheKey },
    { $set: { coordinates: result ?? undefined, found: Boolean(result), expiresAt: new Date(Date.now() + (result ? FOUND_TTL_MS : MISS_TTL_MS)) } },
    { upsert: true }
  );
  return result;
}
