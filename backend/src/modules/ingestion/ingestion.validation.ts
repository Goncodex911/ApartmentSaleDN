import { z } from 'zod';
import '../../utils/validators.js'; // Bật thông báo lỗi tiếng Việt

// Schema kiểm tra dữ liệu đầu vào khi gửi tin nhắn thô để AI bóc tách
export const parseRawPostSchema = z.object({
  rawText: z
    .string({ error: 'Nội dung tin nhắn bắt buộc phải có' })
    .min(10, 'Nội dung tin nhắn quá ngắn để phân tích (tối thiểu 10 ký tự)'),
  sourceType: z
    .enum(['TELEGRAM', 'WHATSAPP', 'ZALO', 'FACEBOOK', 'MANUAL'])
    .optional()
    .default('MANUAL'),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  mediaUrls: z.array(z.url()).optional().default([]),
});

export type ParseRawPostInput = z.infer<typeof parseRawPostSchema>;

// Story 20.2: sửa quyết định gộp của AI
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Mã không hợp lệ');
export const splitSchema = z.object({ masterId: objectId, subListingId: objectId });
export const keepSeparateSchema = z.object({ apartmentId: objectId });
export const mergeIntoSchema = z.object({ apartmentId: objectId, targetId: objectId });

