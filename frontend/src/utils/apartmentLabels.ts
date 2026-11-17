import { Apartment } from '../api/apartmentApi.js';
import { OTHER_ZONE, propertyTypeLabel } from './danang.js';

type MarketInfo = Pick<Apartment, 'minLeaseMonths'> & { attributes: Pick<Apartment['attributes'], 'distanceToBeachM'> };

/** "600m" / "1,2km" */
export const beachDistanceText = (meters: number) =>
  meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1).replace('.0', '').replace('.', ',')}km`;

/** Giá USD đi kèm giá VNĐ: "≈ $760" */
export const usdText = (usd?: number) => (usd ? `≈ $${new Intl.NumberFormat('en-US').format(usd)}` : '');

/**
 * Nhãn khoảng cách biển & thuê tối thiểu (Story 7.2) — dùng chung cho chi tiết căn và trang khách xem.
 * Tiện ích (hồ bơi, dịch vụ bao gồm...) lấy từ utils/amenities.ts (Story 8.5).
 */
export function marketLabels({ attributes, minLeaseMonths }: MarketInfo): string[] {
  return [
    attributes.distanceToBeachM !== undefined && attributes.distanceToBeachM !== null && `Cách biển ${beachDistanceText(attributes.distanceToBeachM)}`,
    minLeaseMonths && `Thuê tối thiểu ${minLeaseMonths} tháng`,
  ].filter(Boolean) as string[];
}

/** Khu vực gửi khách (Story 8.4): "Mỹ An"; căn cũ chưa có khu vực hoặc khu "Khác" → phường, quận. */
export const zoneText = (location: { zone?: string; ward?: string; district: string }) =>
  location.zone && location.zone !== OTHER_ZONE ? location.zone : [location.ward, location.district].filter(Boolean).join(', ');

/** Loại căn + phòng ngủ: ["Căn hộ", "2 phòng ngủ"], ["Studio"], căn cũ chưa có loại → ["2 phòng ngủ"]. */
export function roomParts(attributes: Pick<Apartment['attributes'], 'propertyType' | 'bedrooms'>): string[] {
  if (attributes.propertyType === 'STUDIO') return ['Studio'];
  return [propertyTypeLabel(attributes.propertyType), attributes.bedrooms === 0 ? 'Studio' : `${attributes.bedrooms} phòng ngủ`].filter(Boolean) as string[];
}
