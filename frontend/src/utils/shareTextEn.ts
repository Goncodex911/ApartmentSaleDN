import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { usdText } from './apartmentLabels.js';
import { toAscii, headlineEn, placeEn, bedroomsEn, formatVndEn, depositEn, feesEn, FURNISHING_EN, amenitiesEn, minStayEn, dateEn, intlPhone } from './listingEn.js';

type ShareContact = Pick<User, 'name' | 'phone' | 'zaloPhone'>;

/**
 * Bài gửi khách tiếng Anh (Story 7.3) — cùng danh sách trắng với bản tiếng Việt (Story 5.1):
 * KHÔNG dùng title gốc (tiếng Việt, có thể chứa SĐT), ownerContact, subListings, commission, description, location.address.
 */
export function buildShareTextEn(apartment: Apartment, ctv: ShareContact): string {
  const { price, deposit, attributes, status, availableDate, minLeaseMonths } = apartment;
  const size = [attributes.area && `${attributes.area}m²`, bedroomsEn(attributes.bedrooms), attributes.bathrooms > 0 && `${attributes.bathrooms} bath`]
    .filter(Boolean)
    .join(' · ');
  const deposited = depositEn(price, deposit);
  const fees = feesEn(apartment);
  const amenities = amenitiesEn(apartment);
  const contactPhone = intlPhone(ctv.zaloPhone || ctv.phone);

  return [
    `🏢 ${headlineEn(apartment).toUpperCase()}`,
    `📍 Area: ${placeEn(apartment)}, ${toAscii(apartment.location.city)}`,
    `📐 Size: ${size}`,
    `💵 Price: ${formatVndEn(price)}/month${apartment.priceUsd ? ` (${usdText(apartment.priceUsd)})` : ''}${deposited ? ` · Deposit: ${deposited}` : ''}`,
    fees.length ? `⚡ Fees: ${fees.join(' · ')}` : '',
    `🛋 Furniture: ${FURNISHING_EN[attributes.furnishing]}`,
    amenities.length ? `✨ Amenities: ${amenities.join(', ')}` : '',
    minLeaseMonths ? `📅 Minimum stay: ${minStayEn(minLeaseMonths)}` : '',
    status === 'UPCOMING' && availableDate ? `🗓 Available from: ${dateEn(availableDate)}` : '',
    `📞 Contact: ${toAscii(ctv.name)} – ${contactPhone}${ctv.zaloPhone ? ' (Zalo)' : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}
