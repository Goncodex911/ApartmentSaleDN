import { z } from 'zod';

const vnPhoneRegex = /(84|0[35789])([0-9]{8})\b/;

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  zaloPhone: z.string().regex(vnPhoneRegex, 'Số điện thoại Zalo không hợp lệ (10 số)').optional(),
  avatarUrl: z.string().url('Link ảnh đại diện không hợp lệ').optional().or(z.literal('')),
  greetingMessage: z.string().max(300, 'Lời chào không được quá 300 ký tự').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

