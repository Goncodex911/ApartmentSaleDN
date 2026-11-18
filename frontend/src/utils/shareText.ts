import { Apartment, IncludedService } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { propertyTypeLabel } from './danang.js';
import { zoneText } from './apartmentLabels.js';
import { amenityLabels } from './amenities.js';
import { headlineEn, placeEn, toAscii } from './listingEn.js';
import { Lang } from './shareLang.js';

export type ShareContact = Pick<User, 'name' | 'phone' | 'zaloPhone' | 'paymentTerms' | 'zaloGroupLink' | 'whatsappGroupLink'>;

// Xóa chuỗi giống SĐT Việt Nam (0xxx / +84xxx, 9–11 số) khỏi tiêu đề. Không dùng lookbehind để không lỗi trên iOS Safari cũ.
const stripPhoneNumbers = (text: string) =>
  text
    .replace(/(^|\D)(?:\+84|0)(?:[\s.-]?\d){8,10}(?!\d)/g, '$1')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

const NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const CONTACT_APPS = '(Whatsapp, Viber, Zalo, Telegram…)';

// Dịch vụ bao gồm trong giá — "clean 1 a week" theo mẫu khách dùng (Project Owner chốt, Story 10.4)
const SERVICE_TEXT: Record<IncludedService, string> = {
  WIFI: 'Free wifi',
  CLEANING: 'clean 1 a week',
  ELECTRICITY: 'Electricity included',
  WATER: 'Water included',
  LAUNDRY: 'Laundry',
};

const LABELS = {
  en: {
    type: 'Type', rooms: 'Rooms', size: 'Square meters', address: 'Address', sea: 'Distance to the sea', priceLabel: 'Price for 1 month',
    lease: 'Minimum rental period', free: 'Free dates', other: 'Other conditions', contact: 'Contact', zalo: 'Zalo group',
    whatsapp: 'WhatsApp group', now: 'now', near: 'less than 1km', studio: 'studio',
    bedrooms: (n: number) => `${n} bedroom${n === 1 ? '' : 's'}`,
    months: (n: number) => `${n} month${n === 1 ? '' : 's'}`,
    million: (m: string) => `${m} million VND/month`,
    priceText: (vnd: string, usd?: number) => (usd ? `${usd} USD/month (${vnd})` : vnd),
  },
  vi: {
    type: 'Loại', rooms: 'Phòng', size: 'Diện tích', address: 'Địa chỉ', sea: 'Cách biển', priceLabel: 'Giá thuê 1 tháng',
    lease: 'Thuê tối thiểu', free: 'Ngày trống', other: 'Điều kiện khác', contact: 'Liên hệ', zalo: 'Nhóm Zalo',
    whatsapp: 'Nhóm WhatsApp', now: 'ngay', near: 'dưới 1km', studio: 'Studio',
    bedrooms: (n: number) => `${n} phòng ngủ`,
    months: (n: number) => `${n} tháng`,
    million: (m: string) => `${m} triệu/tháng`,
    priceText: (vnd: string, usd?: number) => (usd ? `${vnd} (${usd} USD)` : vnd),
  },
};

// 17000000 → "17"; 6500000 → "6.5" (EN) / "6,5" (VI)
const millions = (vnd: number, lang: Lang) => String(Math.round(vnd / 100_000) / 10).replace('.', lang === 'vi' ? ',' : '.');
const titleCase = (text: string) => text.replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1));
const dotDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB').replace(/\//g, '.'); // 23.11.2026

/**
 * Bài gửi khách theo mẫu 10 dòng đánh số 1️⃣ → 🔟 (Story 10.4) — VI & EN cùng cấu trúc, chỉ khác nhãn.
 * Thiếu dữ liệu dòng nào thì bỏ dòng đó nhưng GIỮ NGUYÊN SỐ các dòng còn lại (khách quen vị trí thông tin).
 * Danh sách trắng (Story 5.1 / 8.3): KHÔNG SĐT chủ nhà, số nhà, link bản đồ, mô tả gốc, link hệ thống.
 */
export function buildShareText(apartment: Apartment, ctv: ShareContact, lang: Lang = 'vi'): string {
  const L = LABELS[lang];
  const { attributes: a, location, price, priceUsd, minLeaseMonths, status, availableDate } = apartment;
  const isStudio = a.propertyType === 'STUDIO' || a.bedrooms === 0;
  const type = propertyTypeLabel(a.propertyType, lang);
  const street = location.street && (lang === 'en' ? titleCase(toAscii(location.street)) : location.street);
  const area = lang === 'en' ? placeEn(apartment) : zoneText(location);
  const sea = a.distanceToBeachM;
  const priceText = price >= 1_000_000 ? L.million(millions(price, lang)) : `${new Intl.NumberFormat('vi-VN').format(price)} VND`;
  const phone = ctv.zaloPhone || ctv.phone;
  // Tiện ích (không gồm dịch vụ — dịch vụ in dòng riêng), chữ thường như mẫu: "parking, elevator"
  const amenities = amenityLabels({ attributes: a, includedServices: [] }).map((label) => label.toLowerCase()).join(', ');
  const services = (apartment.includedServices || []).map((code) => SERVICE_TEXT[code]).join(', ');
  const conditions = [amenities, services, ctv.paymentTerms].filter(Boolean).map((text) => `- ${text}`);

  const rows: (string | false | undefined)[] = [
    type && `${lang === 'en' ? type.toLowerCase() : type}`,
    isStudio ? L.studio : L.bedrooms(a.bedrooms),
    !!a.area && `${a.area} m2`,
    street || area,
    sea != null && (sea < 1000 ? L.near : `${String(Math.round(sea / 100) / 10).replace('.', lang === 'vi' ? ',' : '.')}km`),
    L.priceText(priceText, priceUsd),
    !!minLeaseMonths && L.months(minLeaseMonths),
    status === 'UPCOMING' && availableDate ? dotDate(availableDate) : L.now,
  ];
  const labels = [L.type, L.rooms, L.size, L.address, L.sea, L.priceLabel, L.lease, L.free];
  const contactPhone = lang === 'en' ? `+84${phone.replace(/\D/g, '').replace(/^(84|0)/, '')}` : phone;

  return [
    lang === 'en' ? headlineEn(apartment) : stripPhoneNumbers(apartment.title),
    ...rows.map((value, i) => (value ? `${NUMBERS[i]} ${labels[i]}: ${value}` : '')),
    conditions.length ? `${NUMBERS[8]} ${L.other}\n${conditions.join('\n')}` : '',
    `${NUMBERS[9]} ${L.contact} ${contactPhone} ${CONTACT_APPS}`,
    ctv.zaloGroupLink && `- ${L.zalo}: ${ctv.zaloGroupLink}`,
    ctv.whatsappGroupLink && `- ${L.whatsapp}: ${ctv.whatsappGroupLink}`,
  ]
    .filter(Boolean)
    .join('\n');
}
