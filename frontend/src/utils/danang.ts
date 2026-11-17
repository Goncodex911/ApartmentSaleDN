// Khu vực (quận cũ) Đà Nẵng — trùng danh sách DANANG_DISTRICTS ở backend (search/landmarks.data.ts)
export const DANANG_DISTRICTS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang', 'Hội An'];

// Story 8.4 — trùng danh mục ở backend (apartments/listing-taxonomy.ts)
export const OTHER_ZONE = 'Khác';
export const ZONES = ['Mỹ An', 'Sơn Trà', 'Hải Châu', 'An Hải', 'Khuê Mỹ', 'Ngũ Hành Sơn', 'Hòa Xuân', OTHER_ZONE] as const;
export type Zone = (typeof ZONES)[number];
// Khu vực "Khác": chọn quận không nằm trong danh sách khu vực
export const OTHER_DISTRICTS = ['Thanh Khê', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang', 'Hội An'];

export const PROPERTY_TYPES = [
  { id: 'APARTMENT', vi: 'Căn hộ', en: 'Apartment' },
  { id: 'STUDIO', vi: 'Studio', en: 'Studio' },
  { id: 'DUPLEX', vi: 'Duplex', en: 'Duplex' },
  { id: 'PENTHOUSE', vi: 'Penthouse', en: 'Penthouse' },
  { id: 'HOUSE', vi: 'Nhà nguyên căn', en: 'Whole house' },
  { id: 'VILLA', vi: 'Villa', en: 'Villa' },
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number]['id'];
export const propertyTypeLabel = (type: PropertyType | undefined, lang: 'vi' | 'en' = 'vi') =>
  PROPERTY_TYPES.find((item) => item.id === type)?.[lang];

export const LEASE_STEPS = [1, 3, 6, 12] as const;
/** Làm tròn lên mốc gần nhất (căn cũ có thể lưu 2, 9 tháng...). */
export const roundLeaseMonths = (months?: number) => (months ? (LEASE_STEPS.find((step) => step >= months) ?? 12) : undefined);
