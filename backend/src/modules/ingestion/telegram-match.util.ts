/**
 * So khớp bài đăng Telegram với người đăng mục tiêu (SĐT hoặc tên / username / từ khóa).
 * Tách khỏi telegram-userbot.service để dùng chung cho cào lịch sử và đón tin thời gian thực.
 */

/** Chuỗi có phải số điện thoại không (bỏ qua khoảng trắng, dấu chấm, gạch ngang, ngoặc, dấu +) */
export function isPhoneNumber(input: string): boolean {
  if (!input) return false;
  return /^\d{9,12}$/.test(input.replace(/[\s.\-+()]/g, ''));
}

/** Chuẩn hóa SĐT về dạng số thuần, bắt đầu bằng 0 (84905123456 → 0905123456) */
export function normalizeDomesticPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('84') && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
}

/**
 * Regex bắt SĐT bất kể người đăng viết cách nào. Ví dụ 0905123456 khớp:
 * "0905123456", "0905.123.456", "0905 123 456", "0905-123-456", "+84905123456", "+84 905 123 456".
 * Có ranh giới số ở 2 đầu để 0905123456 không khớp nhầm bên trong 10905123456 hay 09051234567.
 */
export function buildPhoneRegex(phone: string): RegExp | null {
  const norm = normalizeDomesticPhone(phone);
  if (norm.length < 8) return null;
  const coreDigits = norm.startsWith('0') ? norm.slice(1) : norm;
  const sep = '[\\s.\\-()]*';
  return new RegExp(`(?<!\\d)(?:\\+?84|0)${sep}${coreDigits.split('').join(sep)}(?!\\d)`);
}

/** Chữ thường, bỏ dấu tiếng Việt để so tên / từ khóa ("Hiếu" ≈ "hieu") */
export function normalizeText(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
}

/** Nội dung văn bản gộp của 1 bài (album nhiều ảnh chỉ 1 ảnh có chú thích) */
export function postText(messages: any[]): string {
  return messages
    .map((m) => (m.message || m.text || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Bài đăng (1 tin hoặc cả album) có thuộc người đăng mục tiêu không:
 * 1. SĐT trong nội dung (chuẩn nhất cho tin BĐS) hoặc SĐT của người gửi (nếu Telegram cho xem)
 * 2. Tên / từ khóa trong nội dung ("LH: Trần Minh Hiếu")
 * 3. Tên, username, ID người gửi; tác giả bài kênh (postAuthor); tin chuyển tiếp (fwdFrom)
 */
export function matchesTargetListing(messages: any[], target: string): boolean {
  const targetTrimmed = target.trim();
  if (!targetTrimmed || targetTrimmed === '*' || targetTrimmed.toLowerCase() === 'all') return true;

  const text = postText(messages);

  if (isPhoneNumber(targetTrimmed)) {
    const targetPhone = normalizeDomesticPhone(targetTrimmed);
    if (buildPhoneRegex(targetTrimmed)?.test(text)) return true;
    return messages.some((m) => m.sender?.phone && normalizeDomesticPhone(m.sender.phone) === targetPhone);
  }

  const targetNorm = normalizeText(targetTrimmed.replace(/^@/, ''));
  const includesTarget = (value?: string | null) => Boolean(value) && normalizeText(value!).includes(targetNorm);
  if (includesTarget(text)) return true;

  return messages.some((m) => {
    const sender = m.sender;
    const fullName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}` : '';
    return (
      includesTarget(fullName) ||
      includesTarget(sender?.username) ||
      sender?.id?.toString() === targetTrimmed ||
      m.senderId?.toString() === targetTrimmed ||
      includesTarget(m.postAuthor) ||
      includesTarget(m.fwdFrom?.fromName) ||
      m.fwdFrom?.fromId?.toString() === targetTrimmed
    );
  });
}
