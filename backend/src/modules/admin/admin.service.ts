import { Apartment } from '../apartments/apartment.model.js';
import { User } from '../auth/user.model.js';
import { Lead, OPEN_LEAD_STAGES } from '../leads/lead.model.js';
import { ShareLink } from '../share/share-link.model.js';
import { IngestionEvent } from '../ingestion/ingestion-event.model.js';
import { ListingSubmission } from '../submissions/submission.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Mốc khoảng giá khớp chip lọc của Bảng hàng (filter.builder.ts): <5tr · 5–8tr · 8–12tr · 12–20tr · ≥20tr
const PRICE_BOUNDARIES = [0, 5_000_000, 8_000_000, 12_000_000, 20_000_000];
const PRICE_KEYS = ['under_5m', '5m_8m', '8m_12m', '12m_20m'];

type Bucket = { _id: string | number | null; count: number };
const toMap = (buckets: Bucket[]) => Object.fromEntries(buckets.map((b) => [String(b._id ?? 'UNKNOWN'), b.count]));

export class AdminService {
  /**
   * Số liệu Dashboard (Story 13.1). Căn hộ: 1 lần $facet; phần còn lại đếm song song.
   * Phân bố khu vực / giá chỉ tính căn đang chào (bỏ Đã thuê) — đúng hàng CTV đang bán được.
   */
  static async dashboardStats() {
    const since = new Date(Date.now() - DAY_MS);
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const onMarket = { $match: { status: { $ne: 'RENTED' } } };

    const [[apartments], users, ingestion, [views], openLeads, newLeads, pendingSubmissions] = await Promise.all([
      Apartment.aggregate<{ byStatus: Bucket[]; byZone: Bucket[]; byPrice: Bucket[]; needsReview: { n: number }[] }>([
        {
          $facet: {
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            byZone: [onMarket, { $group: { _id: '$location.zone', count: { $sum: 1 } } }],
            byPrice: [onMarket, { $bucket: { groupBy: '$price', boundaries: PRICE_BOUNDARIES, default: 'above_20m', output: { count: { $sum: 1 } } } }],
            needsReview: [{ $match: { needsReview: true } }, { $count: 'n' }],
          },
        },
      ]),
      User.aggregate<{ _id: { role: string; status: string }; count: number }>([{ $group: { _id: { role: '$role', status: '$status' }, count: { $sum: 1 } } }]),
      IngestionEvent.aggregate<Bucket>([{ $match: { at: { $gte: since } } }, { $group: { _id: '$result', count: { $sum: 1 } } }]),
      ShareLink.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Lead.countDocuments({ stage: { $in: OPEN_LEAD_STAGES } }),
      Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
      ListingSubmission.countDocuments({ status: 'PENDING' }),
    ]);

    const userCount = (match: (id: { role: string; status: string }) => boolean) => users.filter((u) => match(u._id)).reduce((sum, u) => sum + u.count, 0);
    const byStatus = toMap(apartments.byStatus);
    // $bucket đặt khóa theo mốc dưới (0, 5000000…) → đổi về khóa của chip lọc
    const byPrice = Object.fromEntries(apartments.byPrice.map((b) => [typeof b._id === 'number' ? PRICE_KEYS[PRICE_BOUNDARIES.indexOf(b._id)] : String(b._id), b.count]));
    const ingest = toMap(ingestion);

    return {
      apartments: {
        total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
        byStatus,
        byZone: toMap(apartments.byZone),
        byPrice,
        needsReview: apartments.needsReview[0]?.n ?? 0,
      },
      members: {
        collaborators: userCount((id) => id.role === 'COLLABORATOR' && id.status === 'ACTIVE'),
        managers: userCount((id) => id.role !== 'COLLABORATOR' && id.status === 'ACTIVE'),
        pending: userCount((id) => id.status === 'PENDING'),
        blocked: userCount((id) => id.status === 'BLOCKED'),
      },
      ingestion24h: {
        received: Object.values(ingest).reduce((sum, n) => sum + n, 0),
        created: ingest.CREATED ?? 0,
        merged: ingest.MERGED_DUPLICATE ?? 0,
        notRental: ingest.NOT_RENTAL ?? 0,
        failed: ingest.FAILED ?? 0,
      },
      market: { publicViews: views?.total ?? 0, openLeads, newLeads7d: newLeads, pendingSubmissions },
    };
  }
}
