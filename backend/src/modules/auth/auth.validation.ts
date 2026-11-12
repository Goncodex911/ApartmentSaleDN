import { z } from 'zod';

// Regex chuẩn số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84)
const vnPhoneRegex = /(84|0[35789])([0-9]{8})\b/;

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(vnPhoneRegex, 'Số điện thoại Việt Nam không hợp lệ (10 số)'),
  email: z.string().email('Email không đúng định dạng').optional(),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
  role: z.enum(['MANAGER', 'COLLABORATOR']).default('COLLABORATOR'),
});

export const loginSchema = z.object({
  phone: z.string().regex(vnPhoneRegex, 'Số điện thoại không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

