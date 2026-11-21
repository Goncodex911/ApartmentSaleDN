import { z } from 'zod';
import { Types, isValidObjectId } from 'mongoose';
import { User } from '../auth/user.model.js';
import { Notification } from '../notifications/notification.model.js';
import { TelegramService } from '../ingestion/telegram.service.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { publishAnnouncementChanged } from '../realtime/realtime.bus.js';
import { vnDate } from '../jobs/daily-jobs.js';
import { AUDIENCES, Announcement } from './announcement.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_DAY = 10;
const BATCH = 500;
const TELEGRAM_GAP_MS = 50; // ≤ 20 tin / giây — dưới giới hạn ~30 tin / giây của Telegram

export const sendAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(80, 'Tiêu đề tối đa 80 ký tự'),
  body: z.string().trim().min(3, 'Nội dung tối thiểu 3 ký tự').max(500, 'Nội dung tối đa 500 ký tự'),
  audience: z.enum(AUDIENCES),
  pinDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  viaTelegram: z.boolean().default(false),
});

const NOT_FOUND = { status: 404, message: 'Không tìm thấy thông báo' };
const roleFilter = (audience: string) => (audience === 'ALL' ? {} : { role: audience });

// Gửi Telegram chạy nền, tuần tự có giãn cách — lỗi từng người bỏ qua, không ảnh hưởng thông báo trong app
async function sendTelegramInBackground(chatIds: string[], text: string) {
  for (const chatId of chatIds) {
    await TelegramService.sendToChat(chatId, text).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, TELEGRAM_GAP_MS));
  }
}

/** Story 16.9: thông báo chung từ Admin tới Tất cả / CTV / Quản lý — chuông + dải ghim trên Bảng hàng (+ Telegram tùy chọn). */
export class AnnouncementService {
  static async send(actor: AuditActor, input: z.infer<typeof sendAnnouncementSchema>) {
    // Giới hạn 10 thông báo / ngày (giờ Việt Nam) trên toàn hệ thống — tránh làm phiền thành viên
    const startOfVnDay = new Date(`${vnDate()}T00:00:00+07:00`);
    if ((await Announcement.countDocuments({ createdAt: { $gte: startOfVnDay } })) >= MAX_PER_DAY) {
      throw { status: 429, message: `Đã gửi đủ ${MAX_PER_DAY} thông báo hôm nay, vui lòng gửi tiếp vào ngày mai` };
    }
    const [recipients, sender] = await Promise.all([
      User.find({ status: 'ACTIVE', ...roleFilter(input.audience) }).select('_id telegramChatId').lean(),
      User.findById(actor.id).select('name').lean(),
    ]);
    const announcement = await Announcement.create({
      title: input.title,
      body: input.body,
      audience: input.audience,
      pinnedUntil: new Date(Date.now() + input.pinDays * DAY_MS),
      sentBy: actor.id,
      sentByName: sender?.name ?? '',
      recipientCount: recipients.length,
      viaTelegram: input.viaTelegram,
    });

    for (let i = 0; i < recipients.length; i += BATCH) {
      await Notification.insertMany(
        recipients.slice(i, i + BATCH).map((user) => ({ userId: user._id, type: 'ANNOUNCEMENT', title: input.title, body: input.body, announcementId: announcement._id })),
        { ordered: false }
      );
    }
    if (input.viaTelegram) {
      const chatIds = recipients.map((user) => user.telegramChatId).filter((id): id is string => Boolean(id));
      sendTelegramInBackground(chatIds, `📢 ${input.title}\n\n${input.body}`).catch(() => undefined);
    }
    publishAnnouncementChanged();
    AuditService.log(actor, 'SEND_ANNOUNCEMENT', { type: 'SETTINGS', id: announcement._id, title: input.title }, { audience: input.audience, recipients: recipients.length, viaTelegram: input.viaTelegram });
    return announcement;
  }

  /** Danh sách đã gửi + số người đã xem (mở chuông = đã đọc, hoặc bấm đóng dải ghim). */
  static async list(page: number, limit = 20) {
    const [items, total] = await Promise.all([
      Announcement.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Announcement.countDocuments(),
    ]);
    const readers = await Notification.aggregate<{ _id: Types.ObjectId; users: Types.ObjectId[] }>([
      { $match: { announcementId: { $in: items.map((item) => item._id) }, readAt: { $exists: true } } },
      { $group: { _id: '$announcementId', users: { $addToSet: '$userId' } } },
    ]);
    const readMap = new Map(readers.map((row) => [String(row._id), row.users.map(String)]));
    const withSeen = items.map(({ dismissedBy, ...item }) => ({ ...item, seenCount: new Set([...(readMap.get(String(item._id)) ?? []), ...dismissedBy.map(String)]).size }));
    return { items: withSeen, total, page, limit };
  }

  static async revoke(actor: AuditActor, id: string) {
    if (!isValidObjectId(id)) throw NOT_FOUND;
    const announcement = await Announcement.findOneAndUpdate({ _id: id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }, { new: true }).lean();
    if (!announcement) throw { status: 409, message: 'Thông báo đã được thu hồi' };
    publishAnnouncementChanged();
    AuditService.log(actor, 'REVOKE_ANNOUNCEMENT', { type: 'SETTINGS', id: announcement._id, title: announcement.title });
    return announcement;
  }

  /** Dải ghim cho người đang xem: thông báo mới nhất còn hạn, đúng nhóm, chưa bị thu hồi, người này chưa đóng. */
  static async active(user: { id: string; role: string }) {
    return Announcement.findOne({
      revokedAt: { $exists: false },
      pinnedUntil: { $gt: new Date() },
      audience: { $in: ['ALL', user.role] },
      dismissedBy: { $ne: new Types.ObjectId(user.id) },
    })
      .sort({ createdAt: -1 })
      .select('title body createdAt sentByName')
      .lean();
  }

  static async dismiss(userId: string, id: string) {
    if (!isValidObjectId(id)) throw NOT_FOUND;
    await Announcement.updateOne({ _id: id }, { $addToSet: { dismissedBy: userId } });
    // Đóng dải = đã xem → đánh dấu luôn thông báo trong chuông
    await Notification.updateMany({ userId, announcementId: id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  }
}
