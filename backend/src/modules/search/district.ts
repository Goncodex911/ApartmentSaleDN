import { DISTRICT_SYNONYMS } from './slang.dictionary.js';
import { WARD_TO_DISTRICT } from './landmarks.data.js';
import { toSearchTokens, consumePhrase, findPhrase } from './text-tokens.js';

/** Bóc tên khu vực khỏi danh sách từ (so khớp nguyên từ, có viết tắt) → tên chuẩn hoặc undefined. */
export function consumeDistrict(tokens: string[]): string | undefined {
  const matched = consumePhrase(tokens, Object.keys(DISTRICT_SYNONYMS));
  return matched ? DISTRICT_SYNONYMS[matched] : undefined;
}

/** Chuẩn hóa tên khu vực AI/người dùng đưa vào ("Q. Ngũ Hành Sơn", "nhs") → tên chuẩn; không thuộc Đà Nẵng → undefined. */
export const canonicalDistrict = (name?: string | null) => (name ? consumeDistrict(toSearchTokens(name)) : undefined);

export const UNKNOWN_DISTRICT = 'Chưa rõ';

/**
 * Chuẩn hóa vị trí AI bóc từ tin (Story 7.1):
 * - Tin ở Đà Nẵng (hoặc không ghi thành phố): khu vực phải nằm trong danh sách; nếu AI để trống/ghi sai
 *   thì suy ra từ phường trong địa chỉ; vẫn không ra → "Chưa rõ" (Quản lý kiểm tra lại).
 * - Tin ghi rõ tỉnh/thành khác: giữ nguyên giá trị AI trả về.
 */
export function resolveListingLocation(raw: { district?: unknown; ward?: unknown; city?: unknown; address?: unknown }) {
  const text = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined);
  const city = text(raw.city, 60);
  const isDanang = !city || !!findPhrase(toSearchTokens(city), 'Đà Nẵng') || !!canonicalDistrict(city); // "Hội An" ghi ở ô thành phố
  // AI hay ghi nhầm phường vào ô quận ("Mỹ An") → tra phường ở cả 3 ô
  const wardHit = findWard(text(raw.ward, 60)) || findWard(text(raw.district, 50)) || findWard(text(raw.address, 200));
  const ward = wardHit?.ward || text(raw.ward, 60);

  if (!isDanang) return { district: text(raw.district, 50) || UNKNOWN_DISTRICT, ward, city: city! };
  const district = canonicalDistrict(text(raw.district, 50)) || canonicalDistrict(city) || wardHit?.district || UNKNOWN_DISTRICT;
  return { district, ward, city: 'Đà Nẵng' };
}

/** Tìm phường trong đoạn văn (VD địa chỉ "Bà Huyện Thanh Quan, Mỹ An") → { ward, district } hoặc null. */
export function findWard(text?: string | null): { ward: string; district: string } | null {
  if (!text) return null;
  const tokens = toSearchTokens(text);
  // Ưu tiên tên dài trước: "An Hải Bắc" trước "An Hải"
  const ward = Object.keys(WARD_TO_DISTRICT)
    .sort((a, b) => b.length - a.length)
    .find((name) => findPhrase(tokens, name));
  return ward ? { ward, district: WARD_TO_DISTRICT[ward] } : null;
}
