import { Apartment } from '../apartments/apartment.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { maskPhonesInText } from '../../utils/phone-text.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// "18/12" theo giờ VN (Node định dạng vi-VN thành "18-12" nên dùng en-GB)
const dayMonth = (date: Date) => date.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });

/**
 * Nhắc tái ký (Story 11.5): căn RENTED còn ≤ 30 ngày / ≤ 15 ngày / đã quá hạn → báo Quản lý của căn + CTV chốt căn.
 * Quét theo "còn ≤ N ngày" (không phải "đúng N ngày") nên hôm nào không ai mở app thì hôm sau vẫn nhắc bù, không sót.
 * Mỗi mốc chỉ nhắc 1 lần (lease.reminded30At / reminded15At / expiredNotifiedAt). Trả về số căn đã nhắc.
 */
export async function scanLeaseReminders(now = new Date()): Promise<number> {
  const in15 = new Date(now.getTime() + 15 * DAY_MS);
  const in30 = new Date(now.getTime() + 30 * DAY_MS);
  const due = await Apartment.find({
    status: 'RENTED',
    'lease.endDate': { $lte: in30 },
    $or: [
      { 'lease.reminded30At': { $exists: false } },
      { 'lease.reminded15At': { $exists: false }, 'lease.endDate': { $lte: in15 } },
      { 'lease.expiredNotifiedAt': { $exists: false }, 'lease.endDate': { $lt: now } },
    ],
  })
    .select('title managerId lease')
    .limit(500)
    .lean();

  let reminded = 0;
  for (const apartment of due) {
    const lease = apartment.lease!;
    const daysLeft = Math.ceil((lease.endDate.getTime() - now.getTime()) / DAY_MS);
    const title = maskPhonesInText(apartment.title);
    const flags: Record<string, Date> = {};
    let body: string;

    if (daysLeft <= 0) {
      if (lease.expiredNotifiedAt) continue;
      flags['lease.expiredNotifiedAt'] = now;
      body = `${title} đã hết hạn thuê ngày ${dayMonth(lease.endDate)}. Hãy cập nhật: gia hạn hoặc chuyển Sắp trống.`;
    } else if (daysLeft <= 15) {
      if (lease.reminded15At) continue;
      body = `${title} hết hạn thuê ngày ${dayMonth(lease.endDate)} (còn ${daysLeft} ngày). Hãy hỏi khách có gia hạn không.`;
    } else {
      if (lease.reminded30At) continue;
      body = `${title} hết hạn thuê ngày ${dayMonth(lease.endDate)} (còn ${daysLeft} ngày). Hãy hỏi khách có gia hạn không.`;
    }
    // Đã tới mốc muộn hơn thì coi như các mốc sớm hơn cũng đã nhắc
    if (daysLeft <= 15 && !lease.reminded15At) flags['lease.reminded15At'] = now;
    if (!lease.reminded30At) flags['lease.reminded30At'] = now;

    const recipients = [...new Set([apartment.managerId, lease.closedBy].filter(Boolean).map(String))];
    await Promise.all(
      recipients.map((userId) =>
        NotificationService.notify({ userId, type: 'LEASE_EXPIRING', title: daysLeft <= 0 ? 'Hợp đồng thuê đã hết hạn' : 'Sắp hết hạn hợp đồng thuê', body, apartmentId: String(apartment._id) })
      )
    );
    await Apartment.updateOne({ _id: apartment._id }, { $set: flags }, { timestamps: false });
    reminded++;
  }
  return reminded;
}
