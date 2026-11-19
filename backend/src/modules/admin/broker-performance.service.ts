import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../auth/user.model.js';
import { ListingSubmission } from '../submissions/submission.model.js';
import { ShareLink } from '../share/share-link.model.js';
import { Lead, OPEN_LEAD_STAGES } from '../leads/lead.model.js';
import { Apartment } from '../apartments/apartment.model.js';

export const brokerPerformanceQuerySchema = z.object({ range: z.enum(['this_month', 'last_month', 'all']).default('this_month') });
type Range = z.infer<typeof brokerPerformanceQuerySchema>['range'];

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const INACTIVE_DAYS = 30;

// Mốc tháng theo giờ Việt Nam (máy chủ Render chạy giờ UTC) → điều kiện ngày cho $match
function rangeFilter(range: Range): Record<string, Date> | null {
  if (range === 'all') return null;
  const now = new Date(Date.now() + VN_OFFSET_MS);
  const monthStart = (month: number) => new Date(Date.UTC(now.getUTCFullYear(), month, 1) - VN_OFFSET_MS);
  const thisMonth = monthStart(now.getUTCMonth());
  return range === 'this_month' ? { $gte: thisMonth } : { $gte: monthStart(now.getUTCMonth() - 1), $lt: thisMonth };
}

type Row = { _id: Types.ObjectId; [key: string]: unknown };
const byId = (rows: Row[]) => new Map(rows.map((row) => [String(row._id), row]));
const num = (row: Row | undefined, key: string) => Number(row?.[key] ?? 0);

/**
 * [ADMIN] Hiệu suất CTV (Story 13.4). Tin đăng / link / khách mới / căn chốt tính theo khoảng thời gian;
 * lượt xem là số cộng dồn của link (không có mốc từng lượt) → luôn "toàn thời gian";
 * khách đang chăm = hiện tại. Xếp hạng: tin được duyệt → căn chốt → link tạo → lượt xem.
 */
export async function brokerPerformance(range: Range) {
  const period = rangeFilter(range);
  const created = period ? { createdAt: period } : {};

  const [ctvs, submissions, links, leadsCreated, leadsOpen, deals, lastSubmission, lastLink] = await Promise.all([
    User.find({ role: 'COLLABORATOR', status: 'ACTIVE' }).select('name phone ctvCode createdAt').lean(),
    ListingSubmission.aggregate<Row>([
      { $match: created },
      { $group: { _id: '$ctvId', submitted: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } } } },
    ]),
    ShareLink.aggregate<Row>([{ $match: created }, { $group: { _id: '$ctvId', links: { $sum: 1 }, views: { $sum: '$views' } } }]),
    Lead.aggregate<Row>([{ $match: created }, { $group: { _id: '$ctvId', n: { $sum: 1 } } }]),
    Lead.aggregate<Row>([{ $match: { stage: { $in: OPEN_LEAD_STAGES } } }, { $group: { _id: '$ctvId', n: { $sum: 1 } } }]),
    Apartment.aggregate<Row>([
      { $match: { 'lease.closedBy': { $exists: true }, ...(period ? { 'lease.startDate': period } : {}) } },
      { $group: { _id: '$lease.closedBy', n: { $sum: 1 } } },
    ]),
    ListingSubmission.aggregate<Row>([{ $group: { _id: '$ctvId', at: { $max: '$createdAt' } } }]),
    ShareLink.aggregate<Row>([{ $group: { _id: '$ctvId', at: { $max: '$createdAt' } } }]),
  ]);

  const [subMap, linkMap, createdMap, openMap, dealMap, lastSubMap, lastLinkMap] = [submissions, links, leadsCreated, leadsOpen, deals, lastSubmission, lastLink].map(byId);
  const inactiveBefore = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;

  const rows = ctvs.map((ctv) => {
    const id = String(ctv._id);
    const activity = [lastSubMap.get(id)?.at, lastLinkMap.get(id)?.at].filter(Boolean).map((at) => new Date(at as Date).getTime());
    const lastActivityAt = activity.length ? new Date(Math.max(...activity)) : null;
    return {
      _id: id,
      name: ctv.name,
      phone: ctv.phone,
      ctvCode: ctv.ctvCode,
      submitted: num(subMap.get(id), 'submitted'),
      approved: num(subMap.get(id), 'approved'),
      links: num(linkMap.get(id), 'links'),
      views: num(linkMap.get(id), 'views'),
      leadsCreated: num(createdMap.get(id), 'n'),
      leadsOpen: num(openMap.get(id), 'n'),
      deals: num(dealMap.get(id), 'n'),
      lastActivityAt,
      inactive: !lastActivityAt || lastActivityAt.getTime() < inactiveBefore,
    };
  });

  rows.sort((a, b) => b.approved - a.approved || b.deals - a.deals || b.links - a.links || b.views - a.views || a.name.localeCompare(b.name, 'vi'));
  // Top 1–3 chỉ trao cho CTV có đóng góp thật trong kỳ (không vinh danh người toàn số 0)
  return rows.map((row, index) => ({ ...row, rank: index < 3 && row.approved + row.deals + row.links > 0 ? index + 1 : null }));
}
