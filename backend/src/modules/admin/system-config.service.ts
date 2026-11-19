import { z } from 'zod';
import { vnPhone } from '../../utils/validators.js';
import { IngestionEvent } from '../ingestion/ingestion-event.model.js';
import { REVIEW_POLICIES, ISystemConfig, SystemConfig } from './system-config.model.js';

export const updateSettingsSchema = z.object({
  reviewPolicy: z.enum(REVIEW_POLICIES).optional(),
  hotline: vnPhone('Hotline không đúng định dạng SĐT Việt Nam').or(z.literal('')).optional(),
  // Chỉ nhận link https của Zalo (giống link nhóm ở Story 10.4) — chuỗi rỗng = gỡ
  zaloOaUrl: z.string().trim().max(300).refine((url) => url === '' || url.startsWith('https://zalo.me/'), 'Link Zalo OA phải bắt đầu bằng https://zalo.me/').optional(),
});

export const telegramSourceSchema = z.object({
  name: z.string().trim().min(2, 'Tên nhóm tối thiểu 2 ký tự').max(100),
  // Chat ID nhóm Telegram: số nguyên, nhóm/siêu nhóm là số âm (VD -1001234567890)
  chatId: z.string().trim().regex(/^-?\d{5,20}$/, 'Chat ID chỉ gồm số (nhóm thường bắt đầu bằng -100)'),
});

export const toggleSourceSchema = z.object({ active: z.boolean() });

// Nhớ cấu hình 60 giây (bot Telegram đọc ở mỗi tin) — Admin lưu thì xóa ngay → không cần khởi động lại máy chủ
const CACHE_MS = 60_000;
let cached: { value: ISystemConfig; expiresAt: number } | null = null;

const SOURCE_NOT_FOUND = { status: 404, message: 'Không tìm thấy nhóm nguồn' };

export class SystemConfigService {
  static async get(): Promise<ISystemConfig> {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = (await SystemConfig.findById('main').lean()) ?? { _id: 'main', telegramSources: [], reviewPolicy: 'FLAG_ONLY' as const };
    cached = { value, expiresAt: Date.now() + CACHE_MS };
    return value;
  }

  private static async save(update: Record<string, unknown>, filter: Record<string, unknown> = {}) {
    const doc = await SystemConfig.findOneAndUpdate({ _id: 'main', ...filter }, update, { upsert: !Object.keys(filter).length, new: true, setDefaultsOnInsert: true }).lean();
    cached = null;
    return doc;
  }

  /**
   * Nhóm Telegram được phép nạp tin (Story 13.5). Trên web đã có nhóm → chỉ nhận nhóm đang bật
   * (tất cả tạm dừng = không nhận tin nào). Chưa cấu hình trên web → dùng TELEGRAM_SOURCE_CHAT_IDS như trước;
   * biến này cũng trống → nhận mọi nhóm bot đang ở (hành vi cũ). Trả về null = không giới hạn.
   */
  static async allowedTelegramChats(): Promise<string[] | null> {
    const { telegramSources } = await this.get();
    if (telegramSources.length) return telegramSources.filter((source) => source.active).map((source) => source.chatId);
    const fromEnv = (process.env.TELEGRAM_SOURCE_CHAT_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
    return fromEnv.length ? fromEnv : null;
  }

  // [ADMIN] Cấu hình + số tin mỗi nhóm đã nạp trong 7 ngày
  static async getForAdmin() {
    const config = await this.get();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const counts = await IngestionEvent.aggregate<{ _id: string; n: number }>([
      { $match: { at: { $gte: weekAgo }, sourceChatId: { $exists: true } } },
      { $group: { _id: '$sourceChatId', n: { $sum: 1 } } },
    ]);
    const weekly = new Map(counts.map((c) => [c._id, c.n]));
    const envFallback = (process.env.TELEGRAM_SOURCE_CHAT_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
    return {
      reviewPolicy: config.reviewPolicy,
      hotline: config.hotline || '',
      zaloOaUrl: config.zaloOaUrl || '',
      telegramSources: config.telegramSources.map((source) => ({ ...source, weeklyCount: weekly.get(source.chatId) ?? 0 })),
      // Chưa thêm nhóm nào trên web → bot đang dùng danh sách trong biến môi trường (chỉ hiện số lượng, không lộ cấu hình)
      envFallbackCount: config.telegramSources.length ? 0 : envFallback.length,
    };
  }

  static async update(input: z.infer<typeof updateSettingsSchema>) {
    await this.save({ $set: input });
    return this.getForAdmin();
  }

  static async addTelegramSource(input: z.infer<typeof telegramSourceSchema>) {
    const config = await this.get();
    if (config.telegramSources.some((source) => source.chatId === input.chatId)) throw { status: 409, message: 'Nhóm này đã có trong danh sách' };
    await this.save({ $push: { telegramSources: { ...input, active: true, addedAt: new Date() } } });
    return this.getForAdmin();
  }

  static async toggleTelegramSource(chatId: string, active: boolean) {
    const doc = await this.save({ $set: { 'telegramSources.$.active': active } }, { 'telegramSources.chatId': chatId });
    if (!doc) throw SOURCE_NOT_FOUND;
    return this.getForAdmin();
  }

  static async removeTelegramSource(chatId: string) {
    const doc = await this.save({ $pull: { telegramSources: { chatId } } }, { 'telegramSources.chatId': chatId });
    if (!doc) throw SOURCE_NOT_FOUND;
    return this.getForAdmin();
  }
}
