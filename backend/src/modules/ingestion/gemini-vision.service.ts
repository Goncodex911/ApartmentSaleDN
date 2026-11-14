import sharp from 'sharp';
import { GeminiService } from './gemini.service.js';

const PHONE_DETECTION_PROMPT = `Bạn nhận được các ảnh căn hộ cho thuê, đánh số theo thứ tự từ 0.
Hãy chỉ ra những ảnh có CHỮ hiển thị số điện thoại (VD: "0912 345 678", "LH 09xx", "Zalo: ..."),
hoặc watermark/logo của môi giới, sàn bất động sản kèm thông tin liên hệ.
Không tính ảnh chỉ có nội thất, đồ vật, biển số nhà hoặc chữ không phải thông tin liên hệ.
Trả về JSON đúng dạng: {"indexes": [số thứ tự các ảnh vi phạm]}. Không có ảnh nào thì trả về {"indexes": []}.`;

export class GeminiVisionService {
  /**
   * Phát hiện các ảnh có dán SĐT/watermark môi giới (Story 5.2 - AC3).
   * Gửi tất cả ảnh trong 1 request (đã thu nhỏ ≤ 768px để tiết kiệm token).
   * Trả về chỉ số các ảnh vi phạm. Lỗi/timeout → trả về [] để không chặn pipeline nhập tin (fail-open).
   */
  public static async detectImagesWithPhone(images: Buffer[]): Promise<number[]> {
    if (images.length === 0) return [];

    try {
      const imageParts = await Promise.all(
        images.map(async (buffer) => ({
          inline_data: {
            mime_type: 'image/jpeg',
            data: (await sharp(buffer).rotate().resize(768, 768, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer()).toString('base64'),
          },
        }))
      );

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GeminiService.getModel()}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GeminiService.getApiKey() },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PHONE_DETECTION_PROMPT }, ...imageParts] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
      const indexes: unknown[] = Array.isArray(parsed.indexes) ? parsed.indexes : [];

      // Chỉ giữ chỉ số hợp lệ, phòng trường hợp AI trả về số ngoài phạm vi
      return indexes.filter((i): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < images.length);
    } catch {
      return [];
    }
  }
}
