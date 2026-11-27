import { normalizeText } from '../../utils/address-text.js';

const MAX_TITLE_LENGTH = 120;
const MIN_TITLE_LENGTH = 6;

// Nhãn thông số của tin mẫu (đã bỏ dấu, chữ thường): "Address: …" là dòng thông số, không phải tiêu đề
const SPEC_LABELS = new Set(
  ['type', 'rooms', 'square meters', 'address', 'distance', 'price', 'minimum', 'free dates', 'other', 'contact', 'loai', 'phong', 'dien tich', 'dia chi', 'gia', 'lien he']
);

// Chỉ bỏ emoji / ký hiệu trang trí ở 2 đầu dòng — giữ dấu câu có nghĩa như "(gần biển)", "$500"
const DECOR = '[\\p{Extended_Pictographic}\\p{So}\\uFE0F\\u20E3\\u200D\\s*#~=|•_-]+';
const EDGE_DECOR_RE = new RegExp(`^${DECOR}|${DECOR}$`, 'gu');

/**
 * Story 20.3: tiêu đề = nguyên văn dòng khác rỗng đầu tiên của tin mẫu (VD "1BR Apartment for rent – Son Tra").
 * Trả `null` khi dòng đầu là dòng thông số / liên hệ / quá ngắn → nơi gọi dùng tiêu đề AI.
 */
export function extractPostTitle(rawText: string): string | null {
  const firstLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;

  // (a) Bắt đầu bằng emoji số (1️⃣…🔟) hoặc số thứ tự ("1.", "1)", "1 -", "1/") — vẫn giữ "1BR", "2PN"
  if (/^(?:[0-9]️?⃣|\u{1F51F}|\d+\s*[.)/-]\s+)/u.test(firstLine)) return null;

  // (b) Dạng "Nhãn: giá trị" với nhãn thông số
  const colonIndex = firstLine.indexOf(':');
  if (colonIndex > 0 && SPEC_LABELS.has(normalizeText(firstLine.slice(0, colonIndex)))) return null;

  // (c) Chứa SĐT (≥ 9 chữ số liền nhau sau khi bỏ cách / chấm / gạch) hoặc đường dẫn
  if (/\d{9,}/.test(firstLine.replace(/[\s.-]/g, '')) || /http|www\.|zalo\.me/i.test(firstLine)) return null;

  let title = firstLine.normalize('NFC').replace(EDGE_DECOR_RE, '').replace(/\s+/g, ' ');
  if (title.length > MAX_TITLE_LENGTH) {
    const cut = title.lastIndexOf(' ', MAX_TITLE_LENGTH);
    title = title.slice(0, cut > 0 ? cut : MAX_TITLE_LENGTH);
  }

  // (d) Sau khi làm sạch quá ngắn (VD dòng chỉ có "🔥🔥")
  return title.length >= MIN_TITLE_LENGTH ? title : null;
}
