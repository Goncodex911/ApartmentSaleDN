import { removeVietnameseTones } from '../../utils/vietnamese.js';
import { canonicalDistrict } from '../search/district.js';
import { ADDRESS_PLACEHOLDER } from '../../utils/street.js';

/** Bỏ dấu tiếng Việt (cả "đ" → "d"), chữ thường, bỏ ký tự đặc biệt — dùng để so khớp địa chỉ / tiêu đề. */
export const normalizeText = (text = '') =>
  removeVietnameseTones(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Từ không mang tên đường: tiền tố ngõ / kiệt / lô và số nhà (VD "K12/5 Lê Quang Đạo" → "le quang dao")
const STREET_STOPWORDS = new Set(['ngo', 'ngach', 'kiet', 'hem', 'so', 'nha', 'lo', 'k', 'h']);
// "Đường" / "Phố": bỏ chữ, nhưng số đứng sau là TÊN đường ("Đường 2/9" → "2 9")
const STREET_WORDS = new Set(['duong', 'pho']);
const PLACEHOLDER_KEY = normalizeText(ADDRESS_PLACEHOLDER);

/**
 * Khóa tên đường: bỏ số nhà, kiệt, hẻm, chữ "đường". Tin không có tên đường → chuỗi rỗng.
 * Story 19.4: GIỮ số thuộc tên đường — số đứng sau tên ("An Thượng 1" ≠ "An Thượng 38", "Mỹ An 3") hoặc sau chữ
 * "Đường" ("Đường 2/9", "Đường 30/4"); số đứng trước tên / sau K, Kiệt, Hẻm, Số, Lô là số nhà → bỏ.
 * Giới hạn: "30/4" đứng một mình (không có chữ "Đường") không phân biệt được với số kiệt → coi là số nhà.
 */
export function streetKey(text = ''): string {
  // Phần sau dấu phẩy đầu tiên là phường / quận, không thuộc tên đường (giống splitAddress)
  const normalized = normalizeText(text.split(',')[0]);
  if (!normalized || normalized === PLACEHOLDER_KEY) return '';
  const words: string[] = [];
  let inStreetName = false; // Đã gặp tên đường (hoặc chữ "đường") → số phía sau thuộc tên đường
  for (const word of normalized.split(' ')) {
    if (STREET_WORDS.has(word)) inStreetName = true;
    else if (STREET_STOPWORDS.has(word)) inStreetName = false;
    else if (/\d/.test(word)) inStreetName && words.push(word);
    else {
      words.push(word);
      inStreetName = true;
    }
  }
  return words.join(' ');
}

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
