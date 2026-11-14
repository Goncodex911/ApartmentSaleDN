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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
