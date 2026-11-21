// Story 16.2: so trường trước / sau khi sửa căn — giá trị rút gọn để nhật ký nhỏ (Atlas gói free), KHÔNG lộ thông tin chủ nhà
const HIDDEN_PREFIXES = ['ownerContact'];
const SKIP = new Set(['status', 'price', 'needsReview', 'reviewReason']); // Đổi trạng thái / giá đã có mục nhật ký riêng

const summarize = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return value.every((item) => typeof item === 'number') && value.length <= 4 ? value : `${value.length} mục`;
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  if (typeof value === 'object') return '(đã đổi)';
  return value;
};

type Doc = { get: (path: string) => unknown };

/** Chụp giá trị hiện tại của các trường sắp sửa (gọi TRƯỚC khi gán). */
export const snapshotFields = (doc: Doc, paths: string[]) => new Map(paths.filter((path) => !SKIP.has(path)).map((path) => [path, JSON.stringify(doc.get(path) ?? null)]));

/** Các trường thực sự đổi sau khi lưu: { 'location.street': { from, to } }. Trường thông tin chủ nhà chỉ ghi tên trường. */
export function diffFields(doc: Doc, before: Map<string, string>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [path, previous] of before) {
    const current = doc.get(path) ?? null;
    if (JSON.stringify(current) === previous) continue;
    const hidden = HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
    changes[path] = hidden ? { from: '(ẩn)', to: '(ẩn)' } : { from: summarize(JSON.parse(previous)), to: summarize(current) };
  }
  return changes;
}
