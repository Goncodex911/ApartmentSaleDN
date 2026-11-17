import { removeVietnameseTones } from '../../utils/vietnamese.js';

// Danh mục theo ngôn ngữ thị trường khách Đà Nẵng (Story 8.4)
export const PROPERTY_TYPES = ['APARTMENT', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'HOUSE', 'VILLA'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const OTHER_ZONE = 'Khác';
export const ZONES = ['Mỹ An', 'Sơn Trà', 'Hải Châu', 'An Hải', 'Khuê Mỹ', 'Ngũ Hành Sơn', 'Hòa Xuân', OTHER_ZONE] as const;
export type Zone = (typeof ZONES)[number];

/**
 * Khu vực → quận (cũ) để tìm theo quận, ghép khách, chat AI vẫn chạy như trước.
 * "Ngũ Hành Sơn" = phần còn lại của quận ngoài Mỹ An, Khuê Mỹ; "Sơn Trà" = phần còn lại ngoài An Hải.
 * "Khác" → người dùng tự chọn quận.
 */
export const ZONE_TO_DISTRICT: Record<Exclude<Zone, typeof OTHER_ZONE>, string> = {
  'Mỹ An': 'Ngũ Hành Sơn',
  'Khuê Mỹ': 'Ngũ Hành Sơn',
  'Ngũ Hành Sơn': 'Ngũ Hành Sơn',
  'An Hải': 'Sơn Trà',
  'Sơn Trà': 'Sơn Trà',
  'Hải Châu': 'Hải Châu',
  'Hòa Xuân': 'Cẩm Lệ',
};
export const districtOfZone = (zone: Zone) => (zone === OTHER_ZONE ? undefined : ZONE_TO_DISTRICT[zone]);

export const LEASE_STEPS = [1, 3, 6, 12] as const;
/** Làm tròn LÊN mốc gần nhất: 2 → 3, 9 → 12, trên 12 → 12; không hợp lệ → undefined. */
export function roundLeaseMonths(months: unknown): number | undefined {
  const value = Number(months);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return LEASE_STEPS.find((step) => step >= value) ?? 12;
}

// Thứ tự kiểm tra: loại đặc thù trước, "studio" sau cùng (tin villa / nhà nguyên căn hay nhắc "phòng studio")
const PROPERTY_TYPE_HINTS: [PropertyType, RegExp][] = [
  ['VILLA', /\bvilla\b|biet thu/],
  ['PENTHOUSE', /\bpenthouse\b/],
  ['DUPLEX', /\bduplex\b|gac xep|gac lung/],
  ['HOUSE', /nguyen can|whole house|\bnha rieng\b/],
  ['STUDIO', /\bstudio\b/],
];

/** Đoán loại căn từ chữ trong tin (dùng cho script căn cũ và khi AI không trả). Không ra → undefined. */
export function inferPropertyType(text?: string | null): PropertyType | undefined {
  if (!text) return undefined;
  const plain = removeVietnameseTones(text).toLowerCase();
  return PROPERTY_TYPE_HINTS.find(([, pattern]) => pattern.test(plain))?.[0];
}
