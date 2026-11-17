import { Apartment, IncludedService } from '../api/apartmentApi.js';

// Dữ liệu tối thiểu để mô tả căn bằng tiếng Anh — dùng được cho cả Apartment (CTV) và PublicListing (trang khách)
export type ListingInfo = Pick<Apartment, 'price' | 'priceUsd' | 'minLeaseMonths' | 'status' | 'availableDate' | 'fees'> & {
  includedServices?: IncludedService[];
  attributes: Apartment['attributes'];
  location: { street?: string; ward?: string; district: string; city: string };
};

/** Bỏ dấu cho khách nước ngoài dễ đọc: "Ngũ Hành Sơn" → "Ngu Hanh Son". */
export const toAscii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export const formatVndEn = (value?: number) => `${new Intl.NumberFormat('en-US').format(value || 0)} VND`;

/** "0911000111" → "+84 911 000 111" để khách nước ngoài bấm gọi / WhatsApp được. */
export const intlPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^84/, '0');
  return /^0\d{9}$/.test(digits) ? `+84 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone;
};

export const placeEn = ({ location }: Pick<ListingInfo, 'location'>) => {
  const places = [location.ward, location.district === 'Chưa rõ' ? '' : location.district].filter(Boolean) as string[];
  return (places.length ? places : [location.city]).map(toAscii).join(', ');
};

/** Dòng địa chỉ gửi khách: tên đường (không số nhà — Story 8.3) + phường, quận, thành phố. */
export const addressEn = (listing: Pick<ListingInfo, 'location'>) =>
  [listing.location.street && toAscii(listing.location.street), placeEn(listing), toAscii(listing.location.city)].filter(Boolean).join(', ');

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
export const bedroomsEn = (bedrooms: number) => (bedrooms === 0 ? 'Studio' : plural(bedrooms, 'bedroom'));
export const minStayEn = (months: number) => plural(months, 'month');
export const dateEn = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Tiêu đề tiếng Anh tự sinh (tiêu đề gốc do AI viết tiếng Việt): "2BR Apartment for rent – My An, Ngu Hanh Son". */
export const headlineEn = (listing: Pick<ListingInfo, 'attributes' | 'location'>) =>
  `${listing.attributes.bedrooms === 0 ? 'Studio' : `${listing.attributes.bedrooms}BR Apartment`} for rent – ${placeEn(listing)}`;

export const FURNISHING_EN: Record<Apartment['attributes']['furnishing'], string> = {
  FULL: 'Fully furnished',
  BASIC: 'Basic furniture',
  EMPTY: 'Unfurnished',
};

const SERVICE_EN: Record<IncludedService, string> = {
  WIFI: 'Free wifi',
  CLEANING: 'Cleaning',
  ELECTRICITY: 'Electricity included',
  WATER: 'Water included',
  LAUNDRY: 'Laundry',
};

const beachEn = (meters: number) => (meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1).replace('.0', '')}km`);

/** Tiện ích tiếng Anh — ưu tiên những thứ khách nước ngoài hỏi nhiều (biển, hồ bơi) lên đầu. */
export function amenitiesEn({ attributes: a, includedServices }: Pick<ListingInfo, 'attributes' | 'includedServices'>): string[] {
  return [
    a.distanceToBeachM != null && `${beachEn(a.distanceToBeachM)} to the beach`,
    a.pool && 'Pool',
    a.elevator && 'Elevator',
    a.allowPets && 'Pet friendly',
    a.carParking && 'Car parking',
    a.motorbikeParking && 'Motorbike parking',
    a.balcony && 'Balcony',
    a.washingMachine === 'PRIVATE' && 'Private washing machine',
    a.pcccStandard && 'Fire safety',
    ...(includedServices || []).map((code) => SERVICE_EN[code]),
  ].filter(Boolean) as string[];
}

export function feesEn({ fees }: Pick<ListingInfo, 'fees'>): string[] {
  return [
    fees?.electricity && `Electricity ${formatVndEn(fees.electricity)}/kWh`,
    fees?.water && `Water ${formatVndEn(fees.water)}`,
    fees?.service && `Service ${formatVndEn(fees.service)}/month`,
    fees?.parkingMotor && `Parking ${formatVndEn(fees.parkingMotor)}/month`,
  ].filter(Boolean) as string[];
}
