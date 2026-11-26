import { canonicalDistrict } from '../search/district.js';
import { ADDRESS_PLACEHOLDER } from '../../utils/street.js';
import { dateStreetKey, normalizeText, stripAreaSuffix } from '../../utils/address-text.js';

export { normalizeText };

// Từ không mang tên đường: tiền tố ngõ / kiệt / lô và số nhà (VD "K12/5 Lê Quang Đạo" → "le quang dao")
const STREET_STOPWORDS = new Set(['ngo', 'ngach', 'kiet', 'hem', 'so', 'nha', 'lo', 'k', 'h']);
// "Đường" / "Phố": bỏ chữ, nhưng số đứng sau là TÊN đường ("Đường 2/9")
const STREET_WORDS = new Set(['duong', 'pho']);
const PLACEHOLDER_KEY = normalizeText(ADDRESS_PLACEHOLDER);
// CE-03.1: phần phụ sau "," "(" "|" "–" hoặc "-" (trừ "-" giữa 2 số như "30-4") không thuộc tên đường
const ADDRESS_TAIL = /[,(|–]|(?<!\d)-|-(?!\d)/;

/**
 * Khóa tên đường: bỏ số nhà, kiệt, hẻm, chữ "đường", phần ghi chú và tên phường / quận ở cuối.
 * Tin không có tên đường → chuỗi rỗng.
 * Story 19.4: GIỮ số thuộc tên đường — số đứng sau tên ("An Thượng 1" ≠ "An Thượng 38", "Mỹ An 22") hoặc sau chữ
 * "Đường"; số đứng trước tên / sau K, Kiệt, Hẻm, Số, Lô là số nhà → bỏ.
 * CE-03.1: đường ngày lễ ("30/4", "30-4", "Đường 2 tháng 9") → khóa chung "30 thang 4", "2 thang 9".
 */
export function streetKey(text = ''): string {
  const normalized = normalizeText(text.split(ADDRESS_TAIL)[0]);
  if (!normalized || normalized === PLACEHOLDER_KEY) return '';
  const dateKey = dateStreetKey(stripAreaSuffix(normalized));
  if (dateKey) return dateKey;

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
  return stripAreaSuffix(words.join(' '));
}

/**
 * Cùng tên đường: 2 khóa phải BẰNG NHAU (CE-03.1). Trước đây so "chứa nhau" nên "Mỹ An 22" khớp nhầm "Mỹ An";
 * nay phần phường / quận ở cuối đã được bỏ trong streetKey nên không cần so chứa nữa.
 */
export function sameStreet(a?: string, b?: string): boolean {
  const x = streetKey(a);
  return Boolean(x) && x === streetKey(b);
}

/** Cùng quận theo tên chuẩn ("Q. Ngũ Hành Sơn" = "nhs"); 1 bên chưa có quận → không loại. */
export function sameDistrict(a?: string, b?: string): boolean {
  const [x, y] = [a, b].map((name) => canonicalDistrict(name) || normalizeText(name));
  return !x || !y || x === y;
}

// Số đứng sau tên đường nhưng là số phòng / tầng / giá ("Mỹ An 2 phòng ngủ") → không phải đường số
const NOT_STREET_NUMBER = '(?! (?:pn|phong|ngu|wc|tang|lau|m2|m|tr|trieu|k|nguoi|can|toa) )';

/**
 * CE-03.4: tìm trong nội dung tin gốc các đường CÙNG TÊN nhưng KHÁC SỐ với đường của căn chính
 * (căn "Mỹ An" nhưng tin ghi "Mỹ An 22") → dấu hiệu bị gộp nhầm bởi luật so "chứa nhau" cũ.
 */
export function suspectNumberedStreets(masterStreet: string | undefined, rawText = ''): string[] {
  const key = streetKey(masterStreet);
  const base = key.replace(/ \d+$/, '');
  if (!base || /^\d/.test(base)) return []; // Không có tên đường / đường ngày lễ → bỏ qua
  const pattern = new RegExp(` ${base} ([0-9]{1,3})(?= )${NOT_STREET_NUMBER}`, 'g');
  const found = new Set<string>();
  for (const [, number] of ` ${normalizeText(rawText)} `.matchAll(pattern)) {
    if (`${base} ${number}` !== key) found.add(`${base} ${number}`);
  }
  return [...found];
}
