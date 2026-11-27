import { normalizeText } from './street-key.js';

/** "Chữ ký căn" để phân biệt các căn khác nhau trong cùng tòa / cùng môi giới (Story 20.1). Trường thiếu = không biết. */
export interface UnitSignature {
  propertyType?: string;
  bedrooms?: number;
  area?: number;
  buildingName?: string;
  unitLabel?: string;
}

export type UnitComparison = 'SAME' | 'DIFFERENT' | 'UNKNOWN';

// Diện tích lệch quá 10% → 2 căn khác nhau (tin đăng lại cùng căn thường ghi lệch vài m²)
const AREA_TOLERANCE = 0.1;

// "P.502" = "Phòng 502" = "room 502"; "Tòa Monarchy" = "Monarchy"
const labelKey = (text?: string) =>
  normalizeText(text)
    .replace(/^(?:can ho|toa nha|phong|room|unit|apt|block|can|toa|p)\b\s*/, '')
    .replace(/[\s.]/g, '');
const bothDiffer = <T>(a: T | undefined, b: T | undefined) => a !== undefined && b !== undefined && a !== '' && b !== '' && a !== b;

/**
 * So 2 căn cùng SĐT + cùng đường:
 * - DIFFERENT: khác tên tòa / số phòng / loại căn / số phòng ngủ, hoặc diện tích lệch > 10% → chắc chắn 2 căn.
 * - UNKNOWN: không biết số phòng ngủ của 1 bên và không có diện tích cả 2 bên để đối chiếu → không tự gộp.
 * - SAME: còn lại (tin đăng lại cùng căn). GIÁ KHÔNG dùng để tách — môi giới hay đổi giá khi đăng lại.
 */
export function compareUnit(a: UnitSignature, b: UnitSignature): UnitComparison {
  if (bothDiffer(labelKey(a.buildingName), labelKey(b.buildingName))) return 'DIFFERENT';
  if (bothDiffer(labelKey(a.unitLabel), labelKey(b.unitLabel))) return 'DIFFERENT';
  if (bothDiffer(a.propertyType, b.propertyType) || bothDiffer(a.bedrooms, b.bedrooms)) return 'DIFFERENT';

  const hasBothAreas = Boolean(a.area && b.area);
  if (hasBothAreas && Math.abs(a.area! - b.area!) > AREA_TOLERANCE * Math.max(a.area!, b.area!)) return 'DIFFERENT';
  if ((a.bedrooms === undefined || b.bedrooms === undefined) && !hasBothAreas) return 'UNKNOWN';
  return 'SAME';
}

/**
 * Đoán nhanh số PN / diện tích từ nội dung tin gốc (không gọi AI) — chỉ dùng cho script rà gộp nhầm cũ.
 * Diện tích chỉ nhận "m2"/"m²" (không nhận "600m to the sea" là khoảng cách).
 */
export function unitHintsFromText(rawText = ''): UnitSignature {
  const text = normalizeText(rawText.replace(/²/g, '2'));
  const bedrooms = /\bstudio\b/.test(text) ? 0 : Number(text.match(/\b(\d{1,2}) ?(?:pn|br|bedrooms?|phong ngu|n1k)\b/)?.[1] ?? NaN);
  const area = Number(text.match(/\b(\d{2,3}) ?m2\b/)?.[1] ?? NaN);
  return { bedrooms: Number.isNaN(bedrooms) ? undefined : bedrooms, area: Number.isNaN(area) ? undefined : area };
}

/** Chữ ký của căn đã lưu trong kho. */
export const unitOfApartment = (apt: {
  attributes?: { propertyType?: string; bedrooms?: number; area?: number };
  location?: { buildingName?: string; unitLabel?: string };
}): UnitSignature => ({
  propertyType: apt.attributes?.propertyType,
  bedrooms: apt.attributes?.bedrooms,
  area: apt.attributes?.area,
  buildingName: apt.location?.buildingName,
  unitLabel: apt.location?.unitLabel,
});
