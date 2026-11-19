import { toVnPhone } from './validators.js';

// Chuỗi giống SĐT Việt Nam trong văn bản tự do: 0xxx / +84xxx, 9–11 số, cho phép dấu cách/chấm/gạch giữa các số
const PHONE_IN_TEXT = /(?<!\d)(?:\+84|0)(?:[\s.-]?\d){8,10}(?!\d)/g;

/** Xóa hẳn SĐT khỏi văn bản (dùng cho nội dung gửi khách: tiêu đề trang công khai, slug link). */
export const stripPhoneNumbers = (text: string) =>
  text
    .replace(PHONE_IN_TEXT, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Che SĐT trong văn bản, giữ 4 số đầu để CTV biết có SĐT (VD: "0912.345.678" → "0912***"). */
export const maskPhonesInText = (text: string) =>
  text.replace(PHONE_IN_TEXT, (phone) => `${phone.replace(/[\s.-]/g, '').slice(0, 4)}***`);

/**
 * Che SĐT chủ nhà cho CTV (Story 14.1): "0905.123.456", "+84 905 123 456" → "0905***456".
 * Chuỗi không nhận ra là SĐT VN → chỉ giữ 4 chữ số đầu, không bao giờ lộ đủ số.
 */
export const maskPhone = (raw?: string) => {
  if (!raw) return raw;
  const phone = toVnPhone(raw);
  return phone ? `${phone.slice(0, 4)}***${phone.slice(7)}` : `${raw.replace(/\D/g, '').slice(0, 4)}***`;
};

/** Escape ký tự đặc biệt trước khi đưa chuỗi người dùng nhập vào RegExp/$regex (chống regex injection & ReDoS). */
export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
