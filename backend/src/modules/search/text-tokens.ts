import { removeVietnameseTones } from '../../utils/vietnamese.js';

/** Tách câu thành các từ không dấu, chữ thường (VD: "Căn hộ Mỹ An, 2PN" → ["can","ho","my","an","2pn"]). */
export const toSearchTokens = (text: string): string[] =>
  removeVietnameseTones(text || '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Tìm vị trí cụm từ trong danh sách từ — so khớp NGUYÊN TỪ, không so chuỗi con
 * (tránh lỗi "the" bị hiểu là viết tắt "th" của Tây Hồ).
 * Cụm viết liền ("caugiay") cũng khớp với các từ rời ("cau giay") và ngược lại.
 * Trả về [vị trí bắt đầu, số từ] hoặc null.
 */
export function findPhrase(tokens: string[], phrase: string): [number, number] | null {
  const phraseTokens = toSearchTokens(phrase);
  if (phraseTokens.length === 0) return null;
  const joined = phraseTokens.join('');

  for (let start = 0; start < tokens.length; start++) {
    if (!tokens[start]) continue; // Từ đã bị bóc trước đó
    // Khớp đúng từng từ của cụm
    if (phraseTokens.every((word, offset) => tokens[start + offset] === word)) return [start, phraseTokens.length];
    // Khớp dạng viết liền/viết rời: ghép tối đa 4 từ liên tiếp rồi so với cụm viết liền
    let glued = '';
    for (let length = 1; length <= 4 && start + length <= tokens.length; length++) {
      glued += tokens[start + length - 1];
      if (glued === joined) return [start, length];
      if (glued.length >= joined.length) break;
    }
  }
  return null;
}

/** Tìm cụm đầu tiên khớp trong danh sách; xóa các từ đã khớp khỏi `tokens` (đánh dấu rỗng) và trả về cụm đó. */
export function consumePhrase(tokens: string[], phrases: string[]): string | null {
  // Ưu tiên cụm dài trước: "o to do cua" phải được bóc trọn, không chỉ "o to"
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const hit = findPhrase(tokens, phrase);
    if (hit) {
      tokens.fill('', hit[0], hit[0] + hit[1]);
      return phrase;
    }
  }
  return null;
}

// Cụm đệm nhiều từ: bỏ trước khi bỏ từ đệm đơn (để "hồ" trong "hồ bơi" không bị mất oan)
const FILLER_PHRASES = ['can ho', 'chung cu', 'phong tro', 'cho thue', 'can thue', 'tim phong', 'tim can', 'quay dau', 'do lai', 'tro xuong', 'tro len', 'dai hoc', 'close to'];

// Từ đệm đơn: không mang ý nghĩa lọc (tiếng Việt + tiếng Anh hay gặp trong tin Đà Nẵng)
const FILLER_WORDS = new Set([
  'can', 'phong', 'nha', 'cho', 'thue', 'tim', 'gan', 'tai', 'khu', 'quanh', 'co', 'va', 'voi', 'gia', 'tam', 'khoang',
  'duoi', 'tren', 'tu', 'den', 'toi', 'da', 'trieu', 'tr', 'cu', 'thang', 'quan', 'phuong', 'duong', 'pho', 'muon',
  'loai', 'kieu', 'nhe', 'oi', 'la', 'cua', 'near', 'the', 'with', 'and', 'for', 'in', 'at', 'of', 'to', 'rent',
  'apartment', 'apartments', 'room', 'rooms', 'house', 'need', 'looking', 'under', 'below', 'max', 'month', 'on', 'st',
  'street', 'road', 'by', 'dh', 'truong',
]);

// Cụm giá/số đứng riêng: "25tr", "6.5", "20trieu", "700usd", "10m"
const PRICE_TOKEN = /^\d+(?:[.,]\d+)?(?:tr|trieu|cu|k|m|usd)?$/;

/** Lọc bỏ cụm đệm, từ đệm, cụm giá và từ quá ngắn → chỉ còn từ khóa có nghĩa. */
export function meaningfulWords(tokens: string[]): string[] {
  const rest = [...tokens];
  while (consumePhrase(rest, FILLER_PHRASES)) {
    /* bỏ lần lượt mọi cụm đệm */
  }
  return rest.filter((word) => word.length >= 2 && !FILLER_WORDS.has(word) && !PRICE_TOKEN.test(word));
}
