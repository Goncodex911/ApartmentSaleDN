import { Apartment, IncludedService } from '../api/apartmentApi.js';
import { OTHER_ZONE, propertyTypeLabel } from './danang.js';
import { amenityLabels } from './amenities.js';

// Dữ liệu tối thiểu để mô tả căn bằng tiếng Anh — dùng được cho cả Apartment (CTV) và PublicListing (trang khách)
export type ListingInfo = Pick<Apartment, 'price' | 'priceUsd' | 'minLeaseMonths' | 'status' | 'availableDate' | 'fees'> & {
  includedServices?: IncludedService[];
  attributes: Apartment['attributes'];
  location: { street?: string; zone?: string; ward?: string; district: string; city: string };
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
  // Story 8.4: khu vực theo cách gọi của khách; căn cũ / khu "Khác" → phường, quận
  if (location.zone && location.zone !== OTHER_ZONE) return toAscii(location.zone);
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
export const headlineEn = ({ attributes, ...listing }: Pick<ListingInfo, 'attributes' | 'location'>) => {
  const type = propertyTypeLabel(attributes.propertyType, 'en') || 'Apartment';
  const isStudio = attributes.propertyType === 'STUDIO' || attributes.bedrooms === 0;
  return `${isStudio ? 'Studio' : `${attributes.bedrooms}BR ${type}`} for rent – ${placeEn(listing)}`;
};

export const FURNISHING_EN: Record<Apartment['attributes']['furnishing'], string> = {
  FULL: 'Fully furnished',
  BASIC: 'Basic furniture',
  EMPTY: 'Unfurnished',
};

const beachEn = (meters: number) => (meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1).replace('.0', '')}km`);

/** Tiện ích tiếng Anh: khoảng cách biển (khách hỏi đầu tiên) + danh mục tiện ích chung (Story 8.5). */
export function amenitiesEn(listing: Pick<ListingInfo, 'attributes' | 'includedServices'>): string[] {
  const beach = listing.attributes.distanceToBeachM;
  return [...(beach != null ? [`${beachEn(beach)} to the beach`] : []), ...amenityLabels(listing)];
}

export function feesEn({ fees }: Pick<ListingInfo, 'fees'>): string[] {
  return [
    fees?.electricity && `Electricity ${formatVndEn(fees.electricity)}/kWh`,
    fees?.water && `Water ${formatVndEn(fees.water)}`,
    fees?.service && `Service ${formatVndEn(fees.service)}/month`,
    fees?.parkingMotor && `Parking ${formatVndEn(fees.parkingMotor)}/month`,
  ].filter(Boolean) as string[];
}
