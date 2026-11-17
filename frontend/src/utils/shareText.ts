import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { marketLabels, roomParts, usdText, zoneText } from './apartmentLabels.js';
import { OTHER_ZONE } from './danang.js';

type ShareContact = Pick<User, 'name' | 'phone' | 'zaloPhone'>;

const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

// Xóa chuỗi giống SĐT Việt Nam (0xxx / +84xxx, 9–11 số, cho phép dấu cách/chấm/gạch giữa các số).
// Không dùng lookbehind để không lỗi cú pháp trên iOS Safari cũ.
const stripPhoneNumbers = (text: string) =>
  text
    .replace(/(^|\D)(?:\+84|0)(?:[\s.-]?\d){8,10}(?!\d)/g, '$1')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

// Khu vực Đà Nẵng không phải "quận" (Story 7.2)
const DISTRICT_PREFIX: Record<string, string> = { 'Hòa Vang': 'Huyện Hòa Vang', 'Hội An': 'TP Hội An', 'Chưa rõ': 'Đà Nẵng' };

const FURNISHING_LABEL: Record<Apartment['attributes']['furnishing'], string> = {
  FULL: 'Full đồ',
  BASIC: 'Đồ cơ bản',
  EMPTY: 'Nhà trống',
};

/**
 * Sinh bài tư vấn gửi khách (Story 5.1).
 * Chỉ đọc các trường trong danh sách trắng — KHÔNG dùng ownerContact, subListings,
 * description, location.address để không lộ thông tin chủ nhà/nội bộ.
 */
export function buildShareText(apartment: Apartment, ctv: ShareContact): string {
  const { price, location, attributes, fees, status, availableDate } = apartment;

  const district = location.district.trim();
  const districtLabel = /^(quận|huyện|thị xã|tp)/i.test(district) ? district : DISTRICT_PREFIX[district] ?? `Quận ${district}`;
  // Bỏ "Cho thuê" đầu tiêu đề (AI hay đặt vậy) để không thành "CĂN CHO THUÊ CĂN 2PN..."
  const title = stripPhoneNumbers(apartment.title).replace(/^cho thuê\s+/i, '');
  const titleWithPrefix = /^căn(\s|$)/i.test(title) ? title : `Căn ${title}`;
  // Khu vực theo cách gọi của khách (Story 8.4); căn cũ / khu "Khác" → quận
  const areaLabel = location.zone && location.zone !== OTHER_ZONE ? location.zone : districtLabel;
  const header = `🏢 [${areaLabel}] - ${titleWithPrefix}`.toLocaleUpperCase('vi-VN');

  const sizeLine = `📐 ${[...roomParts(attributes), attributes.area && `${attributes.area}m²`].filter(Boolean).join(' · ')}`;

  const feeParts = [
    fees?.electricity ? `Điện ${formatVnd(fees.electricity)}đ/kWh` : '',
    fees?.water ? `Nước ${formatVnd(fees.water)}đ` : '',
    fees?.service ? `Dịch vụ ${formatVnd(fees.service)}đ/tháng` : '',
  ].filter(Boolean);

  const furnishing = [
    FURNISHING_LABEL[attributes.furnishing],
    attributes.washingMachine === 'PRIVATE' ? 'máy giặt riêng' : '',
    attributes.washingMachine === 'SHARED' ? 'máy giặt chung' : '',
  ].filter(Boolean);

  const amenities = [
    attributes.elevator && 'thang máy',
    attributes.carParking && 'ô tô đỗ cửa',
    attributes.allowPets && 'nuôi pet',
    attributes.balcony && 'ban công',
    attributes.pcccStandard && 'PCCC đạt chuẩn',
    ...marketLabels({ ...apartment, minLeaseMonths: undefined }).map((label) => label.toLocaleLowerCase('vi-VN')),
  ]
    .filter(Boolean)
    .join(', ');

  const availableFrom =
    status === 'UPCOMING' && availableDate
      ? new Date(availableDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

  const contactPhone = ctv.zaloPhone || ctv.phone;

  return [
    header,
    `📍 Vị trí: ${[location.street, zoneText(location)].filter(Boolean).join(', ')}`, // Chỉ tên đường, không số nhà (Story 8.3)
    sizeLine,
    `💵 Giá thuê: ${formatVnd(price)} VNĐ/tháng${apartment.priceUsd ? ` (${usdText(apartment.priceUsd)})` : ''}`,
    feeParts.length ? `⚡ Phí: ${feeParts.join(' · ')}` : '',
    `🛋 Nội thất: ${furnishing.join(', ')}`,
    amenities ? `🚗 Tiện ích: ${amenities[0].toLocaleUpperCase('vi-VN')}${amenities.slice(1)}` : '',
    apartment.minLeaseMonths ? `📅 Thuê tối thiểu ${apartment.minLeaseMonths} tháng` : '',
    availableFrom ? `🗓 Trống từ: ${availableFrom}` : '',
    `📞 Liên hệ xem phòng trực tiếp: ${ctv.name} - ${contactPhone}${ctv.zaloPhone ? ' (Zalo)' : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}
