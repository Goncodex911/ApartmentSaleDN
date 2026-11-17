// Địa chỉ AI gán khi tin không ghi địa chỉ — không phải tên đường
export const ADDRESS_PLACEHOLDER = 'Đang cập nhật địa chỉ';

// Một cụm số nhà: tiền tố tùy chọn (Số, Kiệt/K, Hẻm/H, Ngõ, Ngách, Lô) + mã bắt đầu bằng chữ số ("12/3", "25A", "B2.05")
const HOUSE_PART = /^(?:(?:số|so|nhà|nha|kiệt|kiet|hẻm|hem|ngõ|ngo|ngách|ngach|lô|lo|k|h)\.?\s*)?\d[\w/.-]*(?:\s*,\s*|\s+)/iu;
const STREET_WORD = /^(?:đường|duong|phố|pho)\s+(?=\D)/iu; // "Đường 2/9" giữ nguyên

/**
 * Tách địa chỉ thành số nhà (nội bộ) và tên đường (gửi khách) — Story 8.3.
 * "K12/3 Bà Huyện Thanh Quan, Mỹ An" → { houseNumber: "K12/3", street: "Bà Huyện Thanh Quan" }
 * "Số 8 Lô 3 đường Võ Nguyên Giáp"   → { houseNumber: "Số 8 Lô 3", street: "Võ Nguyên Giáp" }
 * Phần sau dấu phẩy đầu tiên (phường, quận) bị bỏ.
 */
export function splitAddress(address?: string | null): { houseNumber?: string; street?: string } {
  if (!address || address.trim() === ADDRESS_PLACEHOLDER) return {};
  let rest = address.trim();
  const houseParts: string[] = [];
  for (let match = rest.match(HOUSE_PART); match; match = rest.match(HOUSE_PART)) {
    houseParts.push(match[0].replace(/[\s,]+$/, ''));
    rest = rest.slice(match[0].length);
  }
  const street = rest.split(',')[0].replace(STREET_WORD, '').trim();
  return { houseNumber: houseParts.join(' ') || undefined, street: street || undefined };
}
