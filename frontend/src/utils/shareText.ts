import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';

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

// Cọc chia hết cho giá → "Cọc N tháng", ngược lại ghi số tiền; cọc = 0 thì bỏ.
const depositText = (price: number, deposit: number) => {
  if (!deposit) return '';
  if (price > 0 && deposit % price === 0) return ` (Cọc ${deposit / price} tháng)`;
  return ` (Cọc ${formatVnd(deposit)} VNĐ)`;
};

const FURNISHING_LABEL: Record<Apartment['attributes']['furnishing'], string> = {
  FULL: 'Full đồ',
  BASIC: 'Đồ cơ bản',
  EMPTY: 'Nhà trống',
};

/**
 * Sinh bài tư vấn gửi khách (Story 5.1).
 * Chỉ đọc các trường trong danh sách trắng — KHÔNG dùng ownerContact, subListings,
 * commission, description, location.address để không lộ thông tin chủ nhà/nội bộ.
 */
export function buildShareText(apartment: Apartment, ctv: ShareContact): string {
  const { price, deposit, location, attributes, fees, status, availableDate } = apartment;

  const district = location.district.trim();
  const districtLabel = /^(quận|huyện|thị xã)/i.test(district) ? district : `Quận ${district}`;
  const title = stripPhoneNumbers(apartment.title);
  const titleWithPrefix = /^căn(\s|$)/i.test(title) ? title : `Căn ${title}`;
  const header = `🏢 [${districtLabel}] - ${titleWithPrefix}`.toLocaleUpperCase('vi-VN');

  const roomLabel = attributes.bedrooms === 0 ? 'Studio' : `${attributes.bedrooms} phòng ngủ`;
  const sizeLine = attributes.area ? `📐 Diện tích: ${attributes.area}m² · ${roomLabel}` : `📐 ${roomLabel}`;

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
    `📍 Khu vực: ${[location.ward, district].filter(Boolean).join(', ')}`,
    sizeLine,
    `💵 Giá thuê: ${formatVnd(price)} VNĐ/tháng${depositText(price, deposit)}`,
    feeParts.length ? `⚡ Phí: ${feeParts.join(' · ')}` : '',
    `🛋 Nội thất: ${furnishing.join(', ')}`,
    amenities ? `🚗 Tiện ích: ${amenities[0].toLocaleUpperCase('vi-VN')}${amenities.slice(1)}` : '',
    availableFrom ? `🗓 Trống từ: ${availableFrom}` : '',
    `📞 Liên hệ xem phòng trực tiếp: ${ctv.name} - ${contactPhone}${ctv.zaloPhone ? ' (Zalo)' : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}
