import { z } from 'zod';
import { vnPhone } from '../../utils/validators.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: vnPhone('Số điện thoại Việt Nam không hợp lệ (10 số)'),
  email: z.email('Email không đúng định dạng').optional(),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
  role: z.enum(['MANAGER', 'COLLABORATOR']).default('COLLABORATOR'),
});

export const loginSchema = z.object({
  phone: vnPhone('Số điện thoại không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

// Story 13.9: tự đổi mật khẩu (độ dài tối thiểu giống lúc đăng ký)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có tối thiểu 6 ký tự').max(100),
  })
  .refine((data) => data.newPassword !== data.currentPassword, { message: 'Mật khẩu mới phải khác mật khẩu hiện tại', path: ['newPassword'] });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
