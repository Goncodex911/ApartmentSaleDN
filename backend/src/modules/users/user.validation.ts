import { z } from 'zod';
import { vnPhone } from '../../utils/validators.js';

// Link nhóm chỉ nhận đúng tên miền (tránh CTV dán link lạ vào bài gửi khách); chuỗi rỗng = xóa link
const groupLink = (prefix: string, message: string) =>
  z.string().trim().max(300).refine((url) => url === '' || url.startsWith(prefix), message).optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  zaloPhone: vnPhone('Số điện thoại Zalo không hợp lệ (10 số)').optional(),
  avatarUrl: z.url('Link ảnh đại diện không hợp lệ').optional().or(z.literal('')),
  greetingMessage: z.string().max(300, 'Lời chào không được quá 300 ký tự').optional(),
  // Story 10.4: để trống = không in dòng đó trong bài gửi khách
  paymentTerms: z.string().trim().max(200, 'Điều kiện thanh toán tối đa 200 ký tự').optional(),
  zaloGroupLink: groupLink('https://zalo.me/', 'Link nhóm Zalo phải bắt đầu bằng https://zalo.me/'),
  whatsappGroupLink: groupLink('https://chat.whatsapp.com/', 'Link nhóm WhatsApp phải bắt đầu bằng https://chat.whatsapp.com/'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ADMIN duyệt (ACTIVE) / khóa (BLOCKED) tài khoản
export const updateUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'BLOCKED']) });
export const listUsersQuerySchema = z.object({ status: z.enum(['ACTIVE', 'PENDING', 'BLOCKED']).default('PENDING') });
