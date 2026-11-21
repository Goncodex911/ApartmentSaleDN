import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { lastDailyRun } from '../jobs/daily-jobs.js';
import { SERVICES, ServiceName, snapshot } from './service-health.js';
import { isConfigured, probe } from './health-probes.js';
import { quotaMeters } from './quota-meters.js';

export type ServiceState = 'NOT_CONFIGURED' | 'UNKNOWN' | 'OK' | 'DEGRADED' | 'DOWN' | 'KEY_INVALID';

// Biến môi trường + nơi sửa của từng dịch vụ (hiện trong hướng dẫn thay key — không bao giờ trả giá trị)
const ENV: Record<ServiceName, { vars: string[]; where: 'Render' | 'Netlify' }> = {
  mongo: { vars: ['MONGODB_URI'], where: 'Render' },
  gemini: { vars: ['GEMINI_API_KEY', 'GEMINI_MODEL'], where: 'Render' },
  cloudinary: { vars: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], where: 'Render' },
  telegram: { vars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_SOURCE_CHAT_IDS'], where: 'Render' },
  nominatim: { vars: ['NOMINATIM_USER_AGENT'], where: 'Render' },
  carto: { vars: ['VITE_MAP_TILE_URL'], where: 'Netlify' },
};

/** Trạng thái = kết quả gần nhất (thật hoặc kiểm tra tay) + lỗi trong 24 giờ: lần cuối OK nhưng có lỗi xen kẽ → Chập chờn. */
async function statusOf(service: ServiceName) {
  const configured = isConfigured(service);
  const snap = await snapshot(service);
  let state: ServiceState = 'UNKNOWN';
  if (!configured) state = 'NOT_CONFIGURED';
  else if (snap.last?.outcome === 'auth_error') state = 'KEY_INVALID';
  else if (snap.last && snap.last.outcome !== 'ok') state = 'DOWN';
  else if (snap.last) state = snap.rateLimited24h || snap.errors24h ? 'DEGRADED' : 'OK';
  return {
    service,
    state,
    env: ENV[service],
    lastCheckedAt: snap.last ? new Date(snap.last.at) : null,
    latencyMs: snap.last?.latencyMs ?? null,
    message: snap.last?.outcome === 'ok' ? null : snap.last?.message ?? null,
    calls24h: snap.calls24h,
    rateLimited24h: snap.rateLimited24h,
    errors24h: snap.errors24h,
    lastFailureAt: snap.lastFailureAt ? new Date(snap.lastFailureAt) : null,
  };
}

const pingSchema = z.object({ services: z.array(z.enum(SERVICES)).optional() });

// [ADMIN] Story 16.8a — /api/v1/admin/health/*
export class HealthController {
  static status = asyncHandler(async (_req, res) => {
    const [services, dailyJobsLastRun] = await Promise.all([Promise.all(SERVICES.map(statusOf)), lastDailyRun()]);
    res.status(200).json({ success: true, data: { services, dailyJobsLastRun } });
  });

  // Story 16.8b: đồng hồ hạn mức
  static quotas = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: await quotaMeters() });
  });

  // Kiểm tra lại (1 hoặc tất cả) — rate limit 6 lần / phút / Admin ở routes
  static ping = asyncHandler(async (req, res) => {
    const { services = [...SERVICES] } = pingSchema.parse(req.body ?? {});
    await probe(services);
    res.status(200).json({ success: true, data: { services: await Promise.all(SERVICES.map(statusOf)) } });
  });
}
