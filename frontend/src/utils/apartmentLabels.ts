import { Apartment, IncludedService } from '../api/apartmentApi.js';
import { OTHER_ZONE, propertyTypeLabel } from './danang.js';

export const SERVICE_LABEL: Record<IncludedService, string> = {
  WIFI: 'Bao wifi',
  CLEANING: 'Dọn phòng',
  ELECTRICITY: 'Bao điện',
  WATER: 'Bao nước',
  LAUNDRY: 'Giặt là',
};

type MarketInfo = Pick<Apartment, 'minLeaseMonths' | 'includedServices'> & {
  attributes: Pick<Apartment['attributes'], 'pool' | 'distanceToBeachM' | 'motorbikeParking'>;
};

/** "600m" / "1,2km" */
export const beachDistanceText = (meters: number) =>
  meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1).replace('.0', '').replace('.', ',')}km`;

/** Giá USD đi kèm giá VNĐ: "≈ $760" */
export const usdText = (usd?: number) => (usd ? `≈ $${new Intl.NumberFormat('en-US').format(usd)}` : '');

/**
 * Nhãn thông tin đặc thù Đà Nẵng (Story 7.2) — dùng chung cho chi tiết căn, trang khách xem và bài gửi khách
 * để 3 nơi luôn hiển thị giống nhau.
 */
export function marketLabels({ attributes, includedServices, minLeaseMonths }: MarketInfo): string[] {
  return [
    attributes.distanceToBeachM !== undefined && attributes.distanceToBeachM !== null && `Cách biển ${beachDistanceText(attributes.distanceToBeachM)}`,
    attributes.pool && 'Hồ bơi',
    attributes.motorbikeParking && 'Chỗ để xe máy',
    ...(includedServices || []).map((code) => SERVICE_LABEL[code]),
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
