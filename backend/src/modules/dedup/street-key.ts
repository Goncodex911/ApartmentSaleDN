import { removeVietnameseTones } from '../../utils/vietnamese.js';
import { canonicalDistrict } from '../search/district.js';

/** Bỏ dấu tiếng Việt (cả "đ" → "d"), chữ thường, bỏ ký tự đặc biệt — dùng để so khớp địa chỉ / tiêu đề. */
export const normalizeText = (text = '') =>
  removeVietnameseTones(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Từ không mang tên đường: tiền tố đường/ngõ/kiệt và số nhà (VD "K12/5 Lê Quang Đạo" → "le quang dao")
const STREET_STOPWORDS = new Set(['duong', 'pho', 'ngo', 'ngach', 'kiet', 'hem', 'so', 'nha', 'k', 'h']);

/** Khóa tên đường: bỏ số nhà, kiệt, hẻm, chữ "đường". Tin không có tên đường → chuỗi rỗng. */
export const streetKey = (text = '') =>
  normalizeText(text).split(' ').filter((w) => w && !/\d/.test(w) && !STREET_STOPWORDS.has(w)).join(' ');

/**
 * Cùng tên đường (Story 14.2): khóa này chứa trọn khóa kia theo NGUYÊN TỪ
 * ("nguyen van thoai" ⊂ "nguyen van thoai my an"; "ho" không khớp "hoang").
 */
export function sameStreet(a?: string, b?: string): boolean {
  const [x, y] = [streetKey(a), streetKey(b)];
  if (!x || !y) return false;
  return ` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `);
}

/** Cùng quận theo tên chuẩn ("Q. Ngũ Hành Sơn" = "nhs"); 1 bên chưa có quận → không loại. */
export function sameDistrict(a?: string, b?: string): boolean {
  const [x, y] = [a, b].map((name) => canonicalDistrict(name) || normalizeText(name));
  return !x || !y || x === y;
}
