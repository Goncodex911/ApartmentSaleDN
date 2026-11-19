import { SystemConfigService } from '../admin/system-config.service.js';

const FAST_LANE_MIN_CONFIDENCE = 90;

/**
 * Chính sách duyệt tin cào (Story 13.5) — quyết định cờ "cần Quản lý kiểm tra" cho căn MỚI tạo từ tin cào.
 * Tin trùng đã gộp vào căn có sẵn (khử trùng SĐT + ảnh dHash) nên không đi qua đây.
 *  - FLAG_ONLY: giữ cờ AI / quy tắc tự gắn (thiếu giá, SĐT, khu vực, loại căn) — hành vi trước Story 13.5
 *  - SAFE: luôn gắn cờ
 *  - FAST_LANE: chỉ bỏ cờ khi đủ thông tin theo quy tắc (cờ AI = false) VÀ điểm tin cậy AI ≥ 90
 */
export async function applyReviewPolicy(ext: { needsReview: boolean; reviewReason?: string | null; confidence?: number | null }) {
  const { reviewPolicy } = await SystemConfigService.get();
  if (reviewPolicy === 'SAFE') {
    return { needsReview: true, reviewReason: ext.reviewReason || 'Chế độ an toàn: mọi tin cào chờ Quản lý kiểm tra' };
  }
  if (reviewPolicy === 'FAST_LANE' && !ext.needsReview && (ext.confidence ?? 0) < FAST_LANE_MIN_CONFIDENCE) {
    return { needsReview: true, reviewReason: `Điểm tin cậy AI ${ext.confidence ?? 'chưa có'}/100 (cần ≥ ${FAST_LANE_MIN_CONFIDENCE} để lên thẳng)` };
  }
  return { needsReview: ext.needsReview, reviewReason: ext.needsReview ? ext.reviewReason || undefined : undefined };
}
