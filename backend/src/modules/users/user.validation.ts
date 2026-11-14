import { z } from 'zod';
import { vnPhone } from '../../utils/validators.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  zaloPhone: vnPhone('Số điện thoại Zalo không hợp lệ (10 số)').optional(),
  avatarUrl: z.url('Link ảnh đại diện không hợp lệ').optional().or(z.literal('')),
  greetingMessage: z.string().max(300, 'Lời chào không được quá 300 ký tự').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ADMIN duyệt (ACTIVE) / khóa (BLOCKED) tài khoản
export const updateUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'BLOCKED']) });
export const listUsersQuerySchema = z.object({ status: z.enum(['ACTIVE', 'PENDING', 'BLOCKED']).default('PENDING') });
