import { isValidObjectId } from 'mongoose';
import { Notification, NotificationType } from './notification.model.js';
import { User } from '../auth/user.model.js';
import { TelegramService } from '../ingestion/telegram.service.js';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  leadId?: string;
  apartmentId?: string;
  submissionId?: string;
}

export class NotificationService {
  /**
   * Lưu thông báo trong app + gửi Telegram nếu người nhận đã liên kết (Story 6.2 - AC5).
   * Trả về false nếu thông báo bị trùng (VD: cặp khách–căn đã báo trước đó).
   */
  static async notify(input: NotifyInput): Promise<boolean> {
    try {
      await Notification.create(input);
    } catch (err: any) {
      if (err.code === 11000) return false;
      throw err;
    }

    // Gửi Telegram chạy nền: không làm chậm phản hồi chat của khách (mục tiêu 3-5 giây); lỗi gửi chỉ bỏ qua
    User.findById(input.userId)
      .select('telegramChatId')
      .lean()
      .then((user) => {
        if (user?.telegramChatId) return TelegramService.sendToChat(user.telegramChatId, `🔔 ${input.title}\n${input.body}`);
      })
      .catch(() => undefined);
    return true;
  }

  /** Gửi cho mọi Quản lý / Admin đang hoạt động (VD có tin CTV chờ duyệt — Story 8.6). */
  static async notifyManagers(input: Omit<NotifyInput, 'userId'>) {
    const managers = await User.find({ role: { $in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE' }).select('_id').lean();
    await Promise.all(managers.map((manager) => this.notify({ ...input, userId: String(manager._id) })));
  }

  static async listForUser(userId: string) {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ userId, readAt: { $exists: false } }),
    ]);
    return { items, unreadCount };
  }

  static async markRead(notificationId: string, userId: string) {
    if (!isValidObjectId(notificationId)) throw { status: 404, message: 'Không tìm thấy thông báo' };
    await Notification.updateOne({ _id: notificationId, userId }, { readAt: new Date() });
  }

  static async markAllRead(userId: string) {
    await Notification.updateMany({ userId, readAt: { $exists: false } }, { readAt: new Date() });
  }
}
