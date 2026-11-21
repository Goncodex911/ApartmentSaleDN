import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { IngestionEvent } from '../ingestion/ingestion-event.model.js';
import { Geocache } from '../search/geocache.model.js';
import { SystemConfigService } from '../admin/system-config.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { callsInLastHour, snapshot } from './service-health.js';
import { isConfigured } from './health-probes.js';

/**
 * Story 16.8b: đồng hồ hạn mức. Mongo cache 5 phút, Cloudinary cache 1 giờ (API usage có giới hạn số lần gọi).
 * Hạn mức Gemini KHÔNG ghi cứng (đổi theo model) — chỉ đếm lượt gọi / 429. CARTO xem trên dashboard CARTO.
 * Mỗi nguồn lỗi riêng → trả { error } cho thẻ đó, không làm hỏng cả trang.
 */
const MB = 1024 * 1024;
const WARN = 0.7;
const DANGER = 0.9;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
const level = (ratio: number) => (ratio >= DANGER ? 'danger' : ratio >= WARN ? 'warn' : 'ok');
const safe = async <T>(task: () => Promise<T>) => task().catch((err) => ({ error: String(err?.message || 'Không đọc được').slice(0, 120) }));

async function mongoUsage() {
  return cached('mongo', 5 * 60 * 1000, async () => {
    const db = mongoose.connection.db!;
    const limitMb = Number(process.env.ATLAS_STORAGE_LIMIT_MB) || 512;
    const stats = await db.stats();
    const usedMb = (stats.storageSize + stats.indexSize) / MB;
    // Top 5 collection lớn nhất — $collStats có thể bị chặn trên gói M0 → bỏ qua phần này, vẫn trả tổng
    let collections: { name: string; mb: number }[] | null = null;
    try {
      const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name);
      const sizes = await Promise.all(
        names.map(async (name) => {
          const [row] = await db.collection(name).aggregate<{ storageStats: { storageSize: number; totalIndexSize: number } }>([{ $collStats: { storageStats: {} } }]).toArray();
          return { name, mb: ((row?.storageStats.storageSize ?? 0) + (row?.storageStats.totalIndexSize ?? 0)) / MB };
        })
      );
      collections = sizes.sort((a, b) => b.mb - a.mb).slice(0, 5).map((item) => ({ ...item, mb: Math.round(item.mb * 10) / 10 }));
    } catch {
      collections = null;
    }
    return { usedMb: Math.round(usedMb * 10) / 10, limitMb, ratio: usedMb / limitMb, level: level(usedMb / limitMb), collections };
  });
}

async function cloudinaryUsage() {
  if (!isConfigured('cloudinary')) return null;
  return cached('cloudinary', 60 * 60 * 1000, async () => {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    const usage = (await cloudinary.api.usage()) as Record<string, any>;
    const used = Number(usage.credits?.usage ?? 0);
    const limit = Number(usage.credits?.limit ?? 0);
    const ratio = limit ? used / limit : 0;
    return {
      creditsUsed: Math.round(used * 100) / 100,
      creditsLimit: limit,
      ratio,
      level: level(ratio),
      storageMb: Math.round(Number(usage.storage?.usage ?? 0) / MB),
      bandwidthMb: Math.round(Number(usage.bandwidth?.usage ?? 0) / MB),
      transformations: Number(usage.transformations?.usage ?? 0),
    };
  });
}

async function telegramUsage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [bySource, last, config] = await Promise.all([
    IngestionEvent.aggregate<{ _id: string; n: number }>([{ $match: { at: { $gte: since }, sourceType: 'TELEGRAM' } }, { $group: { _id: '$sourceChatId', n: { $sum: 1 } } }]),
    IngestionEvent.findOne({ sourceType: 'TELEGRAM' }).sort({ at: -1 }).select('at').lean(),
    SystemConfigService.get(),
  ]);
  const nameOf = new Map(config.telegramSources.map((source) => [source.chatId, source.name]));
  return { lastReceivedAt: last?.at ?? null, sources: bySource.map((row) => ({ name: nameOf.get(row._id) ?? row._id ?? 'Không rõ nhóm', count: row.n })) };
}

export async function quotaMeters() {
  const [mongo, cloud, gemini, nominatim, telegram, geocache] = await Promise.all([
    safe(mongoUsage),
    safe(cloudinaryUsage),
    snapshot('gemini'),
    snapshot('nominatim'),
    safe(telegramUsage),
    safe(async () => ({ found: await Geocache.countDocuments({ found: true }), missed: await Geocache.countDocuments({ found: false }) })),
  ]);
  return {
    mongo,
    cloudinary: cloud,
    gemini: { model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', callsLastHour: callsInLastHour('gemini'), calls24h: gemini.calls24h, rateLimited24h: gemini.rateLimited24h, lastFailureAt: gemini.lastFailureAt ? new Date(gemini.lastFailureAt) : null },
    nominatim: { calls24h: nominatim.calls24h, rateLimited24h: nominatim.rateLimited24h, errors24h: nominatim.errors24h, cache: geocache },
    telegram: isConfigured('telegram') ? telegram : null,
  };
}

/** Việc hằng ngày: Mongo / Cloudinary vượt 90% → báo Admin (1 lần / ngày nhờ việc hằng ngày chỉ chạy 1 lần). */
export async function checkQuotaAlerts() {
  const [mongo, cloud] = await Promise.all([safe(mongoUsage), safe(cloudinaryUsage)]);
  const over: string[] = [];
  if (mongo && 'level' in mongo && mongo.level === 'danger') over.push(`MongoDB đã dùng ${mongo.usedMb}/${mongo.limitMb} MB`);
  if (cloud && 'level' in cloud && cloud.level === 'danger') over.push(`Cloudinary đã dùng ${cloud.creditsUsed}/${cloud.creditsLimit} credits`);
  if (!over.length) return 0;
  await NotificationService.notifyRoles(['ADMIN'], { type: 'SERVICE_INCIDENT', title: 'Sắp chạm hạn mức gói miễn phí', body: `${over.join('; ')}. Dọn dữ liệu cũ hoặc nâng gói để tránh gián đoạn.` });
  return over.length;
}
