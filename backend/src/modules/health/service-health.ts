import { Schema, model } from 'mongoose';
import { NotificationService } from '../notifications/notification.service.js';

/**
 * Story 16.8a: ghi nhận kết quả gọi dịch vụ ngoài khi đang chạy thật (không chỉ khi Admin bấm kiểm tra).
 * Bộ nhớ: sự kiện 24 giờ qua (đếm lượt gọi / 429 / lỗi cho 16.8b). DB: bản ghi nhẹ TTL 7 ngày (≤ 1 / dịch vụ / kết quả / 10 phút)
 * để Render khởi động lại vẫn biết lỗi gần nhất. Lỗi xác thực / sập → báo Admin (≤ 1 lần / dịch vụ / 6 giờ).
 */
export const SERVICES = ['mongo', 'gemini', 'cloudinary', 'telegram', 'nominatim', 'carto'] as const;
export type ServiceName = (typeof SERVICES)[number];
export type Outcome = 'ok' | 'rate_limited' | 'auth_error' | 'error';

const SERVICE_LABEL: Record<ServiceName, string> = { mongo: 'MongoDB Atlas', gemini: 'Google Gemini', cloudinary: 'Cloudinary', telegram: 'Telegram Bot', nominatim: 'OSM Nominatim', carto: 'Bản đồ CARTO' };
const DAY_MS = 24 * 60 * 60 * 1000;
const PERSIST_GAP_MS = 10 * 60 * 1000;
const NOTIFY_GAP_MS = 6 * 60 * 60 * 1000;
const MAX_EVENTS = 5000; // Mỗi dịch vụ — chặn bộ nhớ phình khi gọi rất nhiều

const ServiceHealthLog = model(
  'ServiceHealthLog',
  new Schema(
    { service: { type: String, required: true }, outcome: { type: String, required: true }, message: String, at: { type: Date, default: Date.now, expires: 7 * 24 * 60 * 60 } },
    { collection: 'service_health_logs', versionKey: false }
  )
);

type Last = { outcome: Outcome; at: number; message?: string; latencyMs?: number };
const events = new Map<ServiceName, { at: number; outcome: Outcome }[]>();
const lastOf = new Map<ServiceName, Last>();
const persistedAt = new Map<string, number>();
const notifiedAt = new Map<ServiceName, number>();
const errorStreak = new Map<ServiceName, number>();
const ERROR_STREAK_TO_NOTIFY = 3;

/** Xóa mọi chuỗi giống key / token khỏi thông điệp lỗi trước khi lưu / trả về trình duyệt. */
export const sanitize = (message = '') =>
  message
    .replace(/(key|token|secret|signature|api_key)=([^&\s"]+)/gi, '$1=***')
    .replace(/AIza[\w-]{20,}/g, '***')
    .replace(/bot\d+:[\w-]{30,}/g, 'bot***')
    .replace(/\d{6,}:[\w-]{30,}/g, '***')
    .slice(0, 200);

/**
 * HTTP status → kết quả: 401/403 = key hỏng, 429 = quá hạn mức, ≥ 400 = lỗi. Google trả 400 + "API_KEY_INVALID" khi key sai
 * → đọc thêm nội dung lỗi (nếu có) để nhận đúng "Cần thay key".
 */
const AUTH_HINT = /API_KEY_INVALID|API key not valid|UNAUTHENTICATED|PERMISSION_DENIED|invalid api_key|Unauthorized/i;
// 503 = dịch vụ đang quá tải tạm thời (VD Gemini "high demand"), cùng nhóm với 429 — không phải sập / mất kết nối
export const outcomeOf = (status: number, body = ''): Outcome =>
  status === 401 || status === 403 || (status >= 400 && AUTH_HINT.test(body))
    ? 'auth_error'
    : status === 429 || status === 503
      ? 'rate_limited'
      : status >= 400
        ? 'error'
        : 'ok';

export function record(service: ServiceName, outcome: Outcome, message?: string, latencyMs?: number) {
  const now = Date.now();
  const list = (events.get(service) ?? []).filter((event) => event.at > now - DAY_MS);
  list.push({ at: now, outcome });
  events.set(service, list.slice(-MAX_EVENTS));
  lastOf.set(service, { outcome, at: now, message: message && sanitize(message), latencyMs });

  const persistKey = `${service}:${outcome}`;
  if ((persistedAt.get(persistKey) ?? 0) < now - PERSIST_GAP_MS) {
    persistedAt.set(persistKey, now);
    ServiceHealthLog.create({ service, outcome, message: message && sanitize(message) }).catch(() => undefined);
  }
  // Lỗi thường chỉ báo khi lặp lại liên tiếp (1 lần chập chờn mạng / deploy chồng nhau không đáng báo); key hỏng báo ngay
  const streak = outcome === 'error' ? (errorStreak.get(service) ?? 0) + 1 : 0;
  if (outcome !== 'rate_limited') errorStreak.set(service, streak);
  const shouldNotify = outcome === 'auth_error' || streak >= ERROR_STREAK_TO_NOTIFY;
  if (shouldNotify && (notifiedAt.get(service) ?? 0) < now - NOTIFY_GAP_MS) {
    notifiedAt.set(service, now);
    const reason = outcome === 'auth_error' ? 'API key không hợp lệ hoặc đã hết hạn' : 'không kết nối được';
    NotificationService.notifyRoles(['ADMIN'], { type: 'SERVICE_INCIDENT', title: `${SERVICE_LABEL[service]} gặp sự cố`, body: `${SERVICE_LABEL[service]}: ${reason}. Vào Quản trị → Sức khỏe hệ thống để kiểm tra.` }).catch(() => undefined);
  }
}

/** Đếm 24 giờ qua + kết quả gần nhất (bộ nhớ; trống thì lấy bản ghi DB gần nhất — sau khi Render khởi động lại). */
export async function snapshot(service: ServiceName) {
  const now = Date.now();
  const list = (events.get(service) ?? []).filter((event) => event.at > now - DAY_MS);
  const count = (outcome: Outcome) => list.filter((event) => event.outcome === outcome).length;
  let last: Last | undefined = lastOf.get(service);
  if (!last) {
    const saved = await ServiceHealthLog.findOne({ service }).sort({ at: -1 }).lean();
    if (saved) last = { outcome: saved.outcome as Outcome, at: new Date(saved.at).getTime(), message: saved.message ?? undefined };
  }
  const lastFailure = [...list].reverse().find((event) => event.outcome !== 'ok');
  return { last, calls24h: list.length, ok24h: count('ok'), rateLimited24h: count('rate_limited'), errors24h: count('error') + count('auth_error'), lastFailureAt: lastFailure?.at };
}

// Đếm lượt gọi trong 1 giờ qua (16.8b — Gemini)
export const callsInLastHour = (service: ServiceName) => (events.get(service) ?? []).filter((event) => event.at > Date.now() - DAY_MS / 24).length;
