import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { ServiceName, outcomeOf, record, sanitize, Outcome } from './service-health.js';

/**
 * Story 16.8a: kiểm tra siêu nhẹ từng dịch vụ (không sinh nội dung, không tốn lượt AI). Timeout 5 giây.
 * Nominatim KHÔNG gọi thử (giới hạn 1 request/giây của OSM) — dùng kết quả lần gọi thật gần nhất.
 * CARTO kiểm tra trên trình duyệt Admin (key chỉ có ở frontend).
 */
const TIMEOUT_MS = 5000;
export const PROBED: ServiceName[] = ['mongo', 'gemini', 'cloudinary', 'telegram'];

export const isConfigured = (service: ServiceName) =>
  ({
    mongo: Boolean(process.env.MONGODB_URI),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    nominatim: true, // Không cần key (NOMINATIM_USER_AGENT có mặc định)
    carto: true, // Cấu hình ở Netlify — trình duyệt tự kiểm tra
  })[service];

const withTimeout = <T>(task: Promise<T>) =>
  Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Quá 5 giây không phản hồi')), TIMEOUT_MS))]);

async function httpCheck(url: string, init: RequestInit = {}): Promise<{ outcome: Outcome; message?: string }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.ok) return { outcome: 'ok' };
  const body = await res.text();
  return { outcome: outcomeOf(res.status, body), message: `HTTP ${res.status}: ${body.slice(0, 150)}` };
}

const PROBES: Record<string, () => Promise<{ outcome: Outcome; message?: string }>> = {
  mongo: async () => {
    await withTimeout(mongoose.connection.db!.admin().ping());
    return { outcome: 'ok' };
  },
  gemini: () =>
    httpCheck(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}`, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! }, // Header, không đưa key vào URL
    }),
  cloudinary: async () => {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    try {
      await withTimeout(cloudinary.api.ping());
      return { outcome: 'ok' };
    } catch (err: any) {
      const status = err?.error?.http_code ?? err?.http_code;
      return { outcome: status ? outcomeOf(status) : 'error', message: err?.error?.message || err?.message };
    }
  },
  telegram: () => httpCheck(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`),
};

/** Chạy kiểm tra song song, ghi vào bộ ghi nhận (record) và trả độ trễ. */
export async function probe(services: ServiceName[]) {
  const targets = services.filter((service) => PROBED.includes(service) && isConfigured(service));
  return Promise.all(
    targets.map(async (service) => {
      const started = Date.now();
      let result: { outcome: Outcome; message?: string };
      try {
        result = await PROBES[service]();
      } catch (err: any) {
        result = { outcome: 'error', message: err?.message };
      }
      const latencyMs = Date.now() - started;
      record(service, result.outcome, result.message, latencyMs);
      return { service, ...result, message: result.message && sanitize(result.message), latencyMs };
    })
  );
}
