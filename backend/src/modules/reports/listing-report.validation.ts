import { z } from 'zod';
import { REPORT_REASONS } from './listing-report.model.js';

export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS, 'Vui lòng chọn lý do'),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
  newPrice: z.number().positive('Giá mới phải lớn hơn 0').optional(), // Chỉ dùng khi lý do "Chủ tăng giá"
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// MARK_RENTED: đã cho thuê · UPDATE_PRICE: sửa giá · DISMISS: tin vẫn đúng (wrongReport = báo sai → trừ điểm người báo)
export const resolveReportSchema = z
  .object({
    action: z.enum(['MARK_RENTED', 'UPDATE_PRICE', 'DISMISS']),
    price: z.number().positive('Giá mới phải lớn hơn 0').optional(),
    wrongReport: z.boolean().default(false),
  })
  .refine((data) => data.action !== 'UPDATE_PRICE' || !!data.price, { message: 'Vui lòng nhập giá mới', path: ['price'] });
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
