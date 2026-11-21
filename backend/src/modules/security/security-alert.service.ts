import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { AlertRule, SecurityAlert } from './security-alert.model.js';
import { NotificationService } from '../notifications/notification.service.js';

const HOUR_MS = 60 * 60 * 1000;
const RULE_TITLE: Record<AlertRule, string> = {
  OWNER_CONTACT_SCRAPE: 'Xem SĐT chủ bất thường',
  LOGIN_BRUTE_FORCE: 'Dò mật khẩu',
  MASS_DELETE: 'Xóa nhiều căn',
  NEW_DEVICE_PRIVILEGED: 'Đăng nhập thiết bị mới',
};

export const listAlertsQuerySchema = z.object({
  status: z.enum(['open', 'resolved']).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Story 16.5: tạo / tra cứu / xử lý cảnh báo bảo mật. */
export class SecurityAlertService {
  /**
   * Cùng quy tắc + cùng key trong 1 giờ → tăng `count` của cảnh báo đang có, không tạo mới (không spam).
   * Chỉ lần tạo đầu tiên mới gửi thông báo cho Admin (mức Bảo mật; kèm Telegram nếu Admin đã liên kết).
   */
  static async raise(input: { rule: AlertRule; severity: 'IMPORTANT' | 'SECURITY'; key: string; userId?: string; subject: string; message: string; count: number }) {
    const windowStart = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
    const result = await SecurityAlert.findOneAndUpdate(
      { rule: input.rule, key: input.key, windowStart },
      {
        $set: { message: input.message, count: input.count },
        $setOnInsert: { severity: input.severity, userId: input.userId || undefined, subject: input.subject },
      },
      { upsert: true, new: true, includeResultMetadata: true }
    ).catch((err) => {
      if (err.code === 11000) return null; // 2 lần phát hiện cùng lúc → lần kia đã tạo
      throw err;
    });
    if (!result || result.lastErrorObject?.updatedExisting || input.severity !== 'SECURITY') return;
    await NotificationService.notifyRoles(['ADMIN'], { type: 'SECURITY_ALERT', title: `Cảnh báo: ${RULE_TITLE[input.rule]}`, body: input.message });
  }

  static async list({ status, page, limit }: z.infer<typeof listAlertsQuerySchema>) {
    const filter = { resolvedAt: { $exists: status === 'resolved' } };
    const [items, total] = await Promise.all([
      SecurityAlert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('resolvedBy', 'name').lean(),
      SecurityAlert.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  static countOpen() {
    return SecurityAlert.countDocuments({ resolvedAt: { $exists: false } });
  }

  static async resolve(id: string, actorId: string) {
    if (!isValidObjectId(id)) throw { status: 404, message: 'Không tìm thấy cảnh báo' };
    const alert = await SecurityAlert.findOneAndUpdate({ _id: id, resolvedAt: { $exists: false } }, { $set: { resolvedAt: new Date(), resolvedBy: actorId } }, { new: true }).lean();
    if (!alert) throw { status: 409, message: 'Cảnh báo đã được xử lý' };
    return alert;
  }
}
