import { Apartment, IncludedService } from '../api/apartmentApi.js';

/**
 * Danh mục tiện ích DUY NHẤT (Story 8.5): nhãn tiếng Anh dùng chung cho form, bộ lọc, thẻ, chi tiết,
 * trang khách và bài gửi khách (VI & EN) — thêm / đổi tên tiện ích chỉ sửa ở đây.
 * Thứ tự = thứ tự hiển thị; `top: true` là nhóm khách nước ngoài hỏi nhiều, hiện đầu tiên trên form.
 */
type BooleanAttribute =
  | 'pool' | 'gym' | 'elevator' | 'allowPets' | 'carParking' | 'motorbikeParking'
  | 'bathtub' | 'riverView' | 'seaView' | 'sauna' | 'balcony' | 'pcccStandard';

type AmenityDef =
  | { key: BooleanAttribute; label: string; top?: boolean; kind: 'attribute' }
  | { key: IncludedService; label: string; top?: boolean; kind: 'service' }
  | { key: 'washingMachine'; label: string; top?: boolean; kind: 'washer' };

export const AMENITIES: AmenityDef[] = [
  { key: 'pool', label: 'Pool', top: true, kind: 'attribute' },
  { key: 'gym', label: 'Gym', top: true, kind: 'attribute' },
  { key: 'elevator', label: 'Elevator', top: true, kind: 'attribute' },
  { key: 'allowPets', label: 'Pet friendly', top: true, kind: 'attribute' },
  { key: 'carParking', label: 'Car parking', top: true, kind: 'attribute' },
  { key: 'motorbikeParking', label: 'Motorbike parking', top: true, kind: 'attribute' },
  { key: 'bathtub', label: 'Bathtub', top: true, kind: 'attribute' },
  { key: 'riverView', label: 'River view', top: true, kind: 'attribute' },
  { key: 'seaView', label: 'Sea view', top: true, kind: 'attribute' },
  { key: 'sauna', label: 'Sauna', top: true, kind: 'attribute' },
  { key: 'WIFI', label: 'Free wifi', top: true, kind: 'service' },
  { key: 'CLEANING', label: 'Cleaning', top: true, kind: 'service' },
  { key: 'balcony', label: 'Balcony', kind: 'attribute' },
  { key: 'pcccStandard', label: 'Fire safety', kind: 'attribute' },
  { key: 'washingMachine', label: 'Washing machine', kind: 'washer' },
  { key: 'ELECTRICITY', label: 'Electricity included', kind: 'service' },
  { key: 'WATER', label: 'Water included', kind: 'service' },
  { key: 'LAUNDRY', label: 'Laundry', kind: 'service' },
];
export type AmenityKey = AmenityDef['key'];

export const amenityLabel = (key: string) => AMENITIES.find((item) => item.key === key)?.label || key;

type AmenitySource = { attributes: Partial<Apartment['attributes']>; includedServices?: IncludedService[] };

const isOn = (item: AmenityDef, { attributes, includedServices }: AmenitySource) =>
  item.kind === 'attribute'
    ? Boolean(attributes[item.key])
    : item.kind === 'service'
      ? Boolean(includedServices?.includes(item.key))
      : Boolean(attributes.washingMachine && attributes.washingMachine !== 'NONE');

/** Các tiện ích căn đang có (mã) — dùng làm giá trị form. */
export const amenityKeysOf = (source: AmenitySource): AmenityKey[] => AMENITIES.filter((item) => isOn(item, source)).map((item) => item.key);

/** Nhãn tiện ích căn đang có, đúng thứ tự danh mục. */
export const amenityLabels = (source: AmenitySource): string[] => AMENITIES.filter((item) => isOn(item, source)).map((item) => item.label);

/**
 * Mã tiện ích đã chọn trên form → phần payload. Bật máy giặt giữ "chung" nếu căn đang là máy giặt chung.
 * Tiện ích không chọn gửi false (không phải bỏ trống) → Quản lý bỏ chọn là gỡ được.
 */
export function amenityPayload(keys: AmenityKey[], currentWasher?: Apartment['attributes']['washingMachine']) {
  const attributes: Record<string, unknown> = {};
  const includedServices: IncludedService[] = [];
  for (const item of AMENITIES) {
    const on = keys.includes(item.key);
    if (item.kind === 'attribute') attributes[item.key] = on;
    else if (item.kind === 'service') on && includedServices.push(item.key);
    else attributes.washingMachine = on ? (currentWasher === 'SHARED' ? 'SHARED' : 'PRIVATE') : 'NONE';
  }
  return { attributes, includedServices };
}
