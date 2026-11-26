import type { TelegramClient } from 'telegram';
import { NewMessage } from 'telegram/events/index.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { DedupService } from '../dedup/dedup.service.js';
import { TelegramUserbotService } from './telegram-userbot.service.js';
import { isPhoneNumber, matchesTargetListing, normalizeDomesticPhone, postText } from './telegram-match.util.js';
import { findScrapedMessageIds, markMessageScraped } from './telegram-scraped-message.model.js';
import { User } from '../auth/user.model.js';
import { NotificationService } from '../notifications/notification.service.js';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';
export interface ScrapeProgress {
  level: LogLevel;
  text: string;
  percent?: number;
  item?: any;
}

interface ChatContext {
  client: TelegramClient;
  entity: any;
  chatId: string;
  chatTitle: string;
  userId: string;
  targetSender: string;
}

interface ActiveListener {
  client: TelegramClient;
  handler: (event: any) => Promise<void>;
  chatTitle: string;
  targetSender: string;
  startedAt: Date;
  albumTimers: Map<string, NodeJS.Timeout>;
}

const MAX_PHOTOS_PER_POST = 10;
const ALBUM_WAIT_MS = 1500; // Telegram gửi từng ảnh của album thành tin riêng → chờ gom đủ rồi mới xử lý
const POST_GAP_MS = 1000; // Giãn cách giữa các bài có tải ảnh, tránh bị Telegram chặn vì flood

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const firstId = (messages: any[]) => Math.min(...messages.map((m) => m.id));

/** Gom tin theo album (groupedId) hoặc bài đơn */
function groupIntoPosts(messages: any[]): any[][] {
  const groups = new Map<string, any[]>();
  for (const msg of messages) {
    const key = msg.groupedId ? `g${msg.groupedId}` : `m${msg.id}`;
    groups.set(key, [...(groups.get(key) ?? []), msg]);
  }
  return [...groups.values()];
}

/**
 * Kết quả tìm kiếm chỉ trả về ảnh có chú thích của album → lấy thêm các ảnh anh em (ID liền kề, cùng groupedId)
 * để không mất ảnh khi nạp.
 */
async function completeAlbum(ctx: ChatContext, messages: any[]): Promise<any[]> {
  const groupedId = messages[0]?.groupedId?.toString();
  if (!groupedId) return messages;
  const anchor = firstId(messages);
  const ids = Array.from({ length: MAX_PHOTOS_PER_POST * 2 - 1 }, (_, i) => anchor - MAX_PHOTOS_PER_POST + 1 + i).filter((id) => id > 0);
  try {
    const neighbours = await ctx.client.getMessages(ctx.entity, { ids });
    const album = neighbours.filter((m: any) => m?.groupedId?.toString() === groupedId);
    return album.length >= messages.length ? album : messages;
  } catch {
    return messages;
  }
}

async function uploadPhotos(ctx: ChatContext, messages: any[]): Promise<string[]> {
  const photos = messages.filter((m) => m.photo).slice(0, MAX_PHOTOS_PER_POST);
  const urls = await Promise.all(
    photos.map(async (m) => {
      try {
        const buffer = await ctx.client.downloadMedia(m, {});
        if (!Buffer.isBuffer(buffer)) return null;
        const uploaded = await uploadBufferToCloudinary(buffer, 'apartment_sale/telegram');
        return uploaded?.secure_url ?? null;
      } catch {
        return null; // 1 ảnh lỗi không làm hỏng cả bài
      }
    })
  );
  return urls.filter((url): url is string => Boolean(url));
}

/** Nạp 1 bài (tin đơn hoặc album) vào pipeline AI + khử trùng. Ảnh chỉ tải khi AI xác nhận là tin cho thuê. */
async function ingestPost(ctx: ChatContext, messages: any[]) {
  messages.sort((a, b) => a.id - b.id);
  const rawText = postText(messages);
  if (rawText.length < 10) return { skipped: true as const };

  const postId = firstId(messages);
  const username = ctx.entity?.username;
  const result = await DedupService.processListing({
    sourceType: 'TELEGRAM',
    sourceName: `${ctx.chatTitle} - ${ctx.targetSender}`,
    sourceUrl: username ? `https://t.me/${username}/${postId}` : undefined,
    rawText,
    loadMediaUrls: () => uploadPhotos(ctx, messages),
    managerId: ctx.userId,
    sourceChatId: ctx.chatId,
  });
  markMessageScraped(ctx.chatId, postId);
  return { skipped: false as const, result };
}

async function openChat(userId: string, chatInput: string, targetSender: string): Promise<ChatContext> {
  const client = await TelegramUserbotService.getClient(userId);
  if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');
  const entity = await TelegramUserbotService.withSession(userId, () => TelegramUserbotService.resolveAndJoinChat(client, chatInput));
  return {
    client,
    entity,
    chatId: entity?.id?.toString() || chatInput,
    chatTitle: entity?.title || entity?.username || 'Nhóm BĐS',
    userId,
    targetSender: targetSender.trim(),
  };
}

/** Các cách viết SĐT phổ biến — tìm kiếm của Telegram so theo từ nên "0905.123.456" khác "0905123456" */
function searchQueries(target: string): string[] {
  if (!isPhoneNumber(target)) return [target];
  const p = normalizeDomesticPhone(target);
  return [...new Set([target, p, `${p.slice(0, 4)}.${p.slice(4, 7)}.${p.slice(7)}`, `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`])];
}

export class TelegramHarvestService {
  private static listeners = new Map<string, ActiveListener>();

  /** Cào bài đăng cũ của người đăng mục tiêu trong nhóm, nạp vào Bảng hàng */
  public static async scrapeTargetSender(
    userId: string,
    options: { chatInput: string; targetSender: string; limit?: number; onProgress?: (p: ScrapeProgress) => void; shouldStop?: () => boolean }
  ) {
    const report = options.onProgress ?? (() => undefined);
    const limit = Math.min(50, Math.max(options.limit || 20, 5));

    report({ level: 'info', text: 'Đang kết nối và mở nhóm Telegram...', percent: 5 });
    const ctx = await openChat(userId, options.chatInput, options.targetSender);
    report({ level: 'info', text: `Đang tìm bài của "${ctx.targetSender}" trong "${ctx.chatTitle}"...`, percent: 15 });

    // 1. Tìm kiếm phía máy chủ Telegram (nhanh, quét được tin cũ) + 2. quét tin gần đây để không sót bài mới
    const messageMap = new Map<number, any>();
    for (const query of searchQueries(ctx.targetSender)) {
      try {
        for (const m of await ctx.client.getMessages(ctx.entity, { search: query, limit: limit * 3 })) messageMap.set(m.id, m);
      } catch {
        // Nhóm không hỗ trợ tìm kiếm → dựa vào phần quét tin gần đây
      }
    }
    try {
      for (const m of await ctx.client.getMessages(ctx.entity, { limit: Math.min(300, limit * 6) })) messageMap.set(m.id, m);
    } catch (err: any) {
      report({ level: 'warn', text: `Không đọc được tin gần đây: ${err?.message || 'lỗi không rõ'}` });
    }

    // 3. Gom album → lọc theo người đăng → mới nhất trước
    const matched = groupIntoPosts([...messageMap.values()])
      .filter((post) => matchesTargetListing(post, ctx.targetSender))
      .sort((a, b) => firstId(b) - firstId(a));

    if (matched.length === 0) {
      report({ level: 'warn', text: `Không tìm thấy bài nào của "${ctx.targetSender}" trong nhóm.`, percent: 100 });
      return { total: 0, apartments: [] };
    }

    // 4. Bỏ các bài đã nạp ở lần quét trước (không tốn thêm lượt AI / Cloudinary)
    const done = await findScrapedMessageIds(ctx.chatId, matched.map(firstId));
    const fresh = matched.filter((post) => !done.has(firstId(post)));
    const posts = fresh.slice(0, limit);
    const skippedOld = matched.length - fresh.length;
    report({
      level: 'info',
      text: `Tìm thấy ${matched.length} bài${skippedOld ? ` (${skippedOld} bài đã nạp trước đó, bỏ qua)` : ''}. Sẽ xử lý ${posts.length} bài.`,
      percent: 25,
    });

    const apartments: any[] = [];
    let merged = 0;
    for (const [index, post] of posts.entries()) {
      if (options.shouldStop?.()) {
        report({ level: 'warn', text: 'Đã dừng theo yêu cầu.' });
        break;
      }
      const step = `[${index + 1}/${posts.length}]`;
      const percent = 25 + Math.round(((index + 1) / posts.length) * 70);
      try {
        const outcome = await ingestPost(ctx, await completeAlbum(ctx, post));
        if (outcome.skipped) {
          report({ level: 'info', text: `${step} Bỏ qua bài quá ngắn, không có mô tả`, percent });
          continue;
        }
        const { result } = outcome;
        if (!result.isRentalListing) {
          report({ level: 'info', text: `${step} Bỏ qua, không phải tin cho thuê: ${result.rejectReason || 'AI không nhận ra thông tin căn hộ'}`, percent });
        } else if (result.isDuplicate) {
          // Bài đăng lại căn đã có → gộp làm nguồn phụ của căn đó (cập nhật giá / ảnh so sánh), không tạo căn mới
          merged++;
          report({ level: 'success', text: `${step} Trùng căn đã có trong Bảng hàng → đã gộp làm nguồn phụ`, percent });
        } else {
          apartments.push(result.apartment);
          report({ level: 'success', text: `${step} Căn mới: ${result.apartment.title}`, percent, item: result.apartment });
        }
        await sleep(POST_GAP_MS);
      } catch (err: any) {
        // Bài lỗi KHÔNG được đánh dấu đã nạp → lần quét sau tự xử lý lại
        report({ level: 'error', text: `${step} Lỗi bóc tách AI: ${err?.message || 'lỗi không rõ'} (sẽ tự thử lại ở lần quét sau)`, percent });
      }
    }

    report({ level: 'success', text: `Hoàn tất! ${apartments.length} căn mới${merged ? `, ${merged} bài trùng đã gộp vào căn có sẵn` : ''}.`, percent: 100 });
    return { total: apartments.length, apartments };
  }

  /** Đón bài mới của người đăng mục tiêu theo thời gian thực (đến khi máy chủ khởi động lại hoặc bấm dừng) */
  public static async startRealtimeListener(userId: string, chatInput: string, targetSender: string) {
    await this.stopRealtimeListener(userId, false);
    const ctx = await openChat(userId, chatInput, targetSender);
    const pending = new Map<string, any[]>();
    const albumTimers = new Map<string, NodeJS.Timeout>();
    const needsSender = !isPhoneNumber(ctx.targetSender);

    const processPost = async (messages: any[]) => {
      try {
        // So tên người gửi cần thông tin sender (sự kiện mới thường chưa kèm) → tải bổ sung
        if (needsSender) await Promise.all(messages.map((m) => m.getSender?.().catch(() => null)));
        if (!matchesTargetListing(messages, ctx.targetSender)) return;
        const outcome = await ingestPost(ctx, messages);
        if (!outcome.skipped && outcome.result.apartment && !outcome.result.isDuplicate) {
          console.log(`[Telegram Real-time] Nạp bài mới của ${ctx.targetSender} trong ${ctx.chatTitle}`);
        }
      } catch (err: any) {
        console.error('[Telegram Real-time] Lỗi nạp tin:', err?.message);
      }
    };

    const handler = async (event: any) => {
      const msg = event.message;
      if (!msg) return;
      if (!msg.groupedId) return void processPost([msg]);

      const key = msg.groupedId.toString();
      pending.set(key, [...(pending.get(key) ?? []), msg]);
      clearTimeout(albumTimers.get(key));
      albumTimers.set(
        key,
        setTimeout(() => {
          const album = pending.get(key) ?? [];
          pending.delete(key);
          albumTimers.delete(key);
          void processPost(album);
        }, ALBUM_WAIT_MS)
      );
    };

    ctx.client.addEventHandler(handler, new NewMessage({ chats: [ctx.entity] }));
    this.listeners.set(userId, { client: ctx.client, handler, chatTitle: ctx.chatTitle, targetSender: ctx.targetSender, startedAt: new Date(), albumTimers });
    // Story 19.2 (GAP-02): nhớ cấu hình đón tin → máy chủ khởi động lại (Render ngủ / deploy) tự bật lại
    await User.updateOne({ _id: userId, 'telegramSession.isActive': true }, { $set: { 'telegramSession.listener': { chat: chatInput, targetSender: ctx.targetSender } } });
    return { success: true, chatTitle: ctx.chatTitle, targetSender: ctx.targetSender };
  }

  /**
   * Gọi khi máy chủ khởi động: bật lại bộ đón tin của những người đang bật trước khi máy chủ tắt.
   * Không bật lại được (phiên chết, mất quyền vào nhóm...) → báo chuông để người dùng biết bộ đón tin đã dừng.
   */
  public static async resumeListeners() {
    const users = await User.find({ 'telegramSession.isActive': true, 'telegramSession.listener.chat': { $exists: true } })
      .select('_id telegramSession.listener')
      .lean();
    for (const user of users) {
      const saved = user.telegramSession?.listener;
      if (!saved) continue;
      try {
        await this.startRealtimeListener(String(user._id), saved.chat, saved.targetSender);
      } catch (err: any) {
        await User.updateOne({ _id: user._id }, { $unset: { 'telegramSession.listener': 1 } });
        NotificationService.notify({
          userId: String(user._id),
          type: 'TELEGRAM_DISCONNECTED',
          title: 'Bộ đón tin Telegram đã dừng',
          body: `Máy chủ vừa khởi động lại nhưng không bật lại được bộ đón tin (${err?.message || 'lỗi không rõ'}). Vào Cào tin Telegram để bật lại.`,
        }).catch(() => undefined);
      }
    }
  }

  /** forget = true: người dùng chủ động dừng → xóa cấu hình đã lưu (máy chủ tắt thì KHÔNG xóa để tự bật lại) */
  public static async stopRealtimeListener(userId: string, forget = true) {
    if (forget) await User.updateOne({ _id: userId }, { $unset: { 'telegramSession.listener': 1 } }).catch(() => undefined);
    const active = this.listeners.get(userId);
    if (active) {
      try {
        active.client.removeEventHandler(active.handler, new NewMessage({}));
      } catch {
        /* client đã ngắt */
      }
      for (const timer of active.albumTimers.values()) clearTimeout(timer);
      this.listeners.delete(userId);
    }
    return { success: true };
  }

  public static getRealtimeListenerStatus(userId: string) {
    const active = this.listeners.get(userId);
    if (!active) return { isListening: false };
    return { isListening: true, chatTitle: active.chatTitle, targetSender: active.targetSender, startedAt: active.startedAt };
  }
}
