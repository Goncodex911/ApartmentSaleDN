import { z } from 'zod';
import { vnPhone } from '../../utils/validators.js';

// Link nhóm chỉ nhận đúng tên miền (tránh CTV dán link lạ vào bài gửi khách); chuỗi rỗng = xóa link
const groupLink = (prefix: string, message: string) =>
  z.string().trim().max(300).refine((url) => url === '' || url.startsWith(prefix), message).optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  // Story 19.10: chuỗi rỗng = xóa SĐT Zalo đã lưu
  zaloPhone: vnPhone('Số điện thoại Zalo không hợp lệ (10 số)').optional().or(z.literal('')),
  avatarUrl: z.url('Link ảnh đại diện không hợp lệ').optional().or(z.literal('')),
  greetingMessage: z.string().max(300, 'Lời chào không được quá 300 ký tự').optional(),
  // Story 10.4: để trống = không in dòng đó trong bài gửi khách
  paymentTerms: z.string().trim().max(200, 'Điều kiện thanh toán tối đa 200 ký tự').optional(),
  zaloGroupLink: groupLink('https://zalo.me/', 'Link nhóm Zalo phải bắt đầu bằng https://zalo.me/'),
  whatsappGroupLink: groupLink('https://chat.whatsapp.com/', 'Link nhóm WhatsApp phải bắt đầu bằng https://chat.whatsapp.com/'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Story 16.6: Admin tạo tài khoản (không tạo ADMIN qua giao diện / API) và sửa thông tin cơ bản
export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  phone: vnPhone('Số điện thoại Việt Nam không hợp lệ (10 số)'),
  role: z.enum(['MANAGER', 'COLLABORATOR'], 'Chỉ tạo được tài khoản CTV hoặc Quản lý'),
  email: z.email('Email không hợp lệ').or(z.literal('')).optional(),
});
export const adminUpdateUserSchema = createUserSchema.omit({ role: true }).partial();
export const userNoteSchema = z.object({ text: z.string().trim().min(1, 'Ghi chú không được để trống').max(500, 'Ghi chú tối đa 500 ký tự') });

// ADMIN duyệt (ACTIVE) / khóa (BLOCKED) tài khoản
export const updateUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'BLOCKED']) });
// Story 13.2: lọc theo trạng thái / vai trò, tìm theo tên, SĐT, mã CTV; không gửi gì = tất cả
export const listUsersQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'BLOCKED']).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'COLLABORATOR']).optional(),
  search: z.string().trim().max(50).optional(),
  sort: z.enum(['newest', 'lastActive', 'inactive']).optional(), // Story 16.3
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Admin chỉ chuyển qua lại Quản lý ↔ CTV; không cấp quyền ADMIN qua API
export const updateUserRoleSchema = z.object({ role: z.enum(['MANAGER', 'COLLABORATOR']) });

// Story 13.6: Admin khóa / mở quyền báo lỗi tin
export const updateCanReportSchema = z.object({ canReport: z.boolean() });
