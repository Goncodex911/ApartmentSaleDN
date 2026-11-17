import { Apartment, IncludedService } from '../api/apartmentApi.js';

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
