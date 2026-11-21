import type { MongooseQueryMiddleware, Schema } from 'mongoose';

/**
 * Story 16.7: xóa mềm căn hộ — MỌI truy vấn kho tự bỏ căn trong Thùng rác (không sửa từng nơi gọi, tránh sót).
 * Muốn thấy căn đã xóa (Thùng rác, dọn rác, bảng xếp hạng): ghi rõ `deletedAt` ở cấp ngoài cùng của bộ lọc
 * (find / update / count) hoặc của `$match` đầu tiên (aggregate) → middleware không thêm điều kiện.
 *   - Chỉ căn đã xóa:        { deletedAt: { $ne: null } }
 *   - Cả căn còn lẫn đã xóa: { deletedAt: ANY_DELETION_STATE }
 */
export const NOT_DELETED = { deletedAt: null }; // null khớp cả căn cũ chưa có trường deletedAt
export const ANY_DELETION_STATE = { $not: { $type: 'string' } }; // Luôn đúng (deletedAt chỉ là Date hoặc không có)

const QUERY_HOOKS: MongooseQueryMiddleware[] = ['find', 'findOne', 'countDocuments', 'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany'];

// $search / $geoNear / $searchMeta bắt buộc đứng đầu pipeline → chèn điều kiện ngay sau
const MUST_BE_FIRST = ['$search', '$searchMeta', '$geoNear', '$vectorSearch'];

export function softDeletePlugin(schema: Schema) {
  schema.pre(QUERY_HOOKS, { document: false, query: true }, function () {
    if (!('deletedAt' in this.getFilter())) this.where(NOT_DELETED);
  });

  schema.pre('aggregate', function () {
    const pipeline = this.pipeline() as unknown as Record<string, Record<string, unknown>>[];
    const first = pipeline[0];
    const firstMatch = pipeline.find((stage) => '$match' in stage)?.$match;
    if (firstMatch && 'deletedAt' in firstMatch) return;
    const index = first && MUST_BE_FIRST.some((key) => key in first) ? 1 : 0;
    pipeline.splice(index, 0, { $match: NOT_DELETED });
  });
}
