import { User } from '../auth/user.model.js';
import { DedupService } from '../dedup/dedup.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TelegramService } from './telegram.service.js';

/**
 * Story 18.6: đường dự phòng khi không đăng nhập được Telegram cá nhân —
 * Quản lý / Admin đã liên kết Bot (/start <mã>) chuyển tiếp bài / album từ nhóm BĐS vào chat riêng với Bot
 * → AI bóc tách + khử trùng như cào tin, người chuyển tiếp là người phụ trách căn.
 */
const LIMIT_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
const recent = new Map<string, number[]>();

const NOT_ALLOWED =
  'Chỉ Quản lý / Admin đã liên kết Telegram mới nạp tin qua Bot được. Vào app → Hồ sơ → Liên kết Telegram, rồi chuyển tiếp lại bài.';

/** Đếm số bài trong 1 giờ qua; true = còn trong hạn mức */
function withinLimit(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((at) => at > now - HOUR_MS);
  if (hits.length >= LIMIT_PER_HOUR) return false;
  recent.set(userId, [...hits, now]);
  return true;
}

export async function handleForwardedPost(token: string, messages: any[], rawText: string): Promise<void> {
  const first = messages[0];
  const chatId = String(first.chat.id);
  const reply = (text: string) => TelegramService.sendMessage(token, chatId, text, first.message_id);

  const user = await User.findOne({ telegramChatId: chatId, role: { $in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE' }).select('_id role').lean();
  if (!user) return reply(NOT_ALLOWED);
  if (rawText.trim().length < 10) return reply('Bài không có phần mô tả. Hãy chuyển tiếp nguyên bài (kèm chữ) từ nhóm BĐS.');
  if (!withinLimit(String(user._id))) return reply(`Bạn đã chuyển tiếp ${LIMIT_PER_HOUR} bài trong 1 giờ, vui lòng chờ rồi gửi tiếp.`);

  // Tên nhóm gốc (Bot API mới: forward_origin; cũ: forward_from_chat)
  const originChat = messages.map((m) => m.forward_origin?.chat ?? m.forward_from_chat).find(Boolean);
  const sourceName = originChat?.title || 'Chuyển tiếp từ Telegram';
  const photoFileIds: string[] = messages.flatMap((m) => (m.photo?.length ? [m.photo[m.photo.length - 1].file_id] : []));

  try {
    const result = await DedupService.processListing({
      sourceType: 'TELEGRAM',
      sourceName,
      rawText,
      // Ảnh chỉ tải lên Cloudinary khi AI xác nhận là tin cho thuê
      loadMediaUrls: async () =>
        (await Promise.allSettled(photoFileIds.map((id) => TelegramService.uploadPhoto(token, id)))).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])),
      managerId: String(user._id),
      sourceChatId: originChat?.id ? String(originChat.id) : undefined,
    });

    AuditService.log({ id: String(user._id), role: user.role }, 'TELEGRAM_SCRAPE', { type: 'SETTINGS', title: `Telegram: ${sourceName}` }, {
      source: 'FORWARD',
      imported: result.apartment ? 1 : 0,
      status: result.isRentalListing ? 'COMPLETED' : 'NOT_RENTAL',
    });

    if (!result.isRentalListing) return reply(`Không phải tin cho thuê: ${result.rejectReason || 'bị bộ lọc loại'}.`);
    if (result.isDuplicate) return reply('Căn này đã có trong Bảng hàng → đã gộp bài làm nguồn phụ (cập nhật giá / ảnh so sánh).');
    return reply(`Đã nạp căn mới vào Bảng hàng: ${result.apartment?.title ?? ''}`);
  } catch (err: any) {
    console.error('[Telegram Bot] Lỗi nạp bài chuyển tiếp:', err?.message);
    return reply('Hệ thống đang bận (AI quá tải), vui lòng chuyển tiếp lại bài sau ít phút.');
  }
}
