import { Types, isValidObjectId } from 'mongoose';
import { User } from '../auth/user.model.js';
import { Apartment } from '../apartments/apartment.model.js';
import { ListingSubmission } from '../submissions/submission.model.js';
import { ShareLink } from '../share/share-link.model.js';
import { Lead } from '../leads/lead.model.js';
import { ListingReport } from '../reports/listing-report.model.js';
import { AuditLog } from '../audit/audit-log.model.js';

export type OverviewRange = '30d' | 'all';
type Bucket = { _id: string; n: number };
const toMap = (rows: Bucket[]) => Object.fromEntries(rows.map((row) => [row._id, row.n]));

/**
 * [ADMIN] Story 16.3: Hồ sơ 360° — thông tin + số liệu cá nhân gom 1 lần (Promise.all).
 * Khách CRM chỉ trả SỐ LƯỢNG theo giai đoạn (Q2) — không có tên / SĐT / ghi chú khách.
 */
export async function getUserOverview(userId: string, range: OverviewRange) {
  if (!isValidObjectId(userId)) throw { status: 404, message: 'Không tìm thấy thành viên' };
  const id = new Types.ObjectId(userId);
  const since = range === '30d' ? { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } : undefined;
  const created = since ? { createdAt: since } : {};

  const user = await User.findById(id).select('name phone email role ctvCode status createdAt trustScore canReport telegramChatId lastLoginAt lastActiveAt refreshSessions.expiresAt').lean();
  if (!user) throw { status: 404, message: 'Không tìm thấy thành viên' };

  const [apartmentsCreated, apartmentsUpdated, submissions, reviewed, links, leads, deals, reports, contactViews] = await Promise.all([
    Apartment.countDocuments({ managerId: id, ...created }),
    AuditLog.countDocuments({ userId: id, action: 'UPDATE_APARTMENT', ...created }),
    ListingSubmission.aggregate<Bucket>([{ $match: { ctvId: id, ...created } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ListingSubmission.aggregate<Bucket>([{ $match: { reviewedBy: id, ...(since && { updatedAt: since }) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ShareLink.aggregate<{ links: number; views: number }>([{ $match: { ctvId: id, ...created } }, { $group: { _id: null, links: { $sum: 1 }, views: { $sum: '$views' } } }]),
    Lead.aggregate<Bucket>([{ $match: { ctvId: id, ...created } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    Apartment.countDocuments({ 'lease.closedBy': id, ...(since && { 'lease.startDate': since }) }),
    ListingReport.aggregate<Bucket>([{ $match: { reporterId: id, ...created } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    AuditLog.countDocuments({ userId: id, action: 'UNMASK_OWNER_CONTACT', ...created }),
  ]);

  const now = Date.now();
  const { refreshSessions, telegramChatId, ...info } = user;
  return {
    user: { ...info, telegramLinked: Boolean(telegramChatId), activeSessions: (refreshSessions ?? []).filter((session) => new Date(session.expiresAt).getTime() > now).length },
    stats: {
      apartmentsCreated,
      apartmentsUpdated,
      submissions: toMap(submissions), // PENDING / APPROVED / REJECTED / WITHDRAWN (CTV gửi)
      reviewed: toMap(reviewed), // APPROVED / REJECTED (Quản lý duyệt)
      shareLinks: links[0]?.links ?? 0,
      shareViews: links[0]?.views ?? 0,
      leadsByStage: toMap(leads),
      deals,
      reports: toMap(reports), // RESOLVED = báo đúng, DISMISSED = bị bác, OPEN = đang chờ
      contactViews,
    },
  };
}
