import { removeVietnameseTones } from './vietnamese.js';
import { WARD_TO_DISTRICT } from '../modules/search/landmarks.data.js';

/** Bỏ dấu tiếng Việt (cả "đ" → "d"), chữ thường, bỏ ký tự đặc biệt — dùng để so khớp địa chỉ / tiêu đề. */
export const normalizeText = (text = '') =>
  removeVietnameseTones(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Tên phường / quận Đà Nẵng (đã bỏ dấu), dài trước ngắn sau để "an hai bac" được bỏ trước "an hai"
const AREA_NAMES = [...new Set([...Object.keys(WARD_TO_DISTRICT), ...Object.values(WARD_TO_DISTRICT), 'Đà Nẵng'].map((name) => normalizeText(name)))]
  .sort((a, b) => b.length - a.length);
const AREA_SUFFIX = new RegExp(` (?:(?:phuong|p|quan|q|tp|thanh pho) )?(?:${AREA_NAMES.join('|')})$`);

/**
 * CE-03.1: bỏ tên phường / quận ở CUỐI địa chỉ ("nguyen van thoai my an" → "nguyen van thoai").
 * Chỉ bỏ khi là đuôi chuỗi (có dấu cách phía trước, không có số phía sau): "my an 22" là tên đường → giữ;
 * "my an" đứng một mình không có dấu cách phía trước → giữ (vừa là phường vừa là tên đường).
 */
export function stripAreaSuffix(normalized: string): string {
  let text = normalized;
  for (let next = text.replace(AREA_SUFFIX, ''); next !== text; next = text.replace(AREA_SUFFIX, '')) text = next;
  return text;
}

// Đường mang tên ngày lễ ở Đà Nẵng: 30/4, 2/9, 3/2, 29/3
const DATE_STREETS = new Set(['30 4', '2 9', '3 2', '29 3']);

/**
 * Chuỗi đã chuẩn hóa CHỈ gồm tên đường ngày ("30 4", "duong 2 thang 9") → khóa chuẩn "30 thang 4"; khác → ''.
 * Có tên đường khác phía sau ("30 4 my an 22") thì "30/4" là số kiệt → không phải đường ngày.
 */
export function dateStreetKey(normalized: string): string {
  const match = normalized.match(/^(?:(?:duong|pho) )?(\d{1,2}) (?:thang )?(\d{1,2})$/);
  return match && DATE_STREETS.has(`${match[1]} ${match[2]}`) ? `${match[1]} thang ${match[2]}` : '';
}
