import { Apartment } from '../api/apartmentApi.js';
import { amenityLabels } from './amenities.js';
import { zoneText } from './apartmentLabels.js';

/**
 * Story 19.1: dữ kiện dùng chung cho bài Zalo / WhatsApp — chỉ nói đúng những gì căn có.
 * - Vị trí: tên đường + khu vực, KHÔNG BAO GIỜ dùng `location.address` (chứa số nhà) hay chuỗi giữ chỗ "Đang cập nhật địa chỉ".
 * - Tiện ích: theo dữ liệu thật (nội thất + tiện ích + dịch vụ bao gồm), căn không có thì không ghi.
 */
export function placeOf(apartment: Apartment): { street?: string; area: string } {
  const location = apartment.location;
  return { street: location?.street?.trim() || undefined, area: location ? zoneText(location) || location.district : '' };
}

const FURNISHING = {
  vi: { FULL: 'Full nội thất', BASIC: 'Nội thất cơ bản' },
  en: { FULL: 'Fully furnished', BASIC: 'Basic furniture' },
} as const;

export function highlightsOf(apartment: Apartment, lang: 'vi' | 'en'): string[] {
  const furnishing = apartment.attributes?.furnishing;
  const furniture = furnishing === 'FULL' || furnishing === 'BASIC' ? FURNISHING[lang][furnishing] : undefined;
  // Nhãn tiện ích dùng chung với bài gửi khách (Story 8.5) — bài tiếng Việt cũng dùng nhãn này như mẫu 10 dòng
  const amenities = amenityLabels({ attributes: apartment.attributes ?? {}, includedServices: apartment.includedServices });
  return [furniture, ...amenities].filter((item): item is string => Boolean(item));
}
