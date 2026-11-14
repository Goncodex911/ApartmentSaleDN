import sharp from 'sharp';

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

/**
 * Dán watermark chữ ở góc dưới bên phải ảnh, cỡ chữ tỉ lệ theo chiều rộng ảnh.
 * Chỉ nên truyền chữ ASCII (VD: "Tel/Zalo: 0987654321") để không phụ thuộc font tiếng Việt trên server.
 */
export async function addTextWatermark(input: Buffer, text: string): Promise<Buffer> {
  // EXIF orientation 5–8 = ảnh chụp dọc lưu xoay 90°: sau rotate() chiều rộng/cao đổi chỗ
  const { width: rawWidth = 0, height: rawHeight = 0, orientation = 1 } = await sharp(input).metadata();
  const [width, height] = orientation >= 5 ? [rawHeight, rawWidth] : [rawWidth, rawHeight];

  const fontSize = Math.max(14, Math.round(width * 0.045));
  const margin = Math.round(fontSize * 0.8);
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${width - margin}" y="${height - margin}" text-anchor="end"
      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="#ffffff" fill-opacity="0.85" stroke="#000000" stroke-opacity="0.6" stroke-width="${Math.max(1, fontSize / 12)}"
      paint-order="stroke">${escapeXml(text)}</text>
  </svg>`;

  // Giải mã 1 lần duy nhất: xoay theo EXIF → dán watermark → nén JPEG (không nén 2 lần làm giảm chất lượng ảnh)
  return sharp(input)
    .rotate()
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 85 })
    .toBuffer();
}
