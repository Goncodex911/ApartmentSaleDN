import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { createApartmentSchema } from '../apartments/apartment.validation.js';
import { SUBMISSION_STATUSES } from './submission.model.js';

// Ảnh / video của tin CTV phải là file đã tải lên Cloudinary của hệ thống: server tải ảnh về để so trùng (pHash)
// → không cho CTV gửi link tùy ý (chống SSRF, chống dùng ảnh nơi khác)
const isOwnMediaUrl = (url: string) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return url.startsWith(cloud ? `https://res.cloudinary.com/${cloud}/` : 'https://res.cloudinary.com/');
};
const mediaList = z.array(z.url().refine(isOwnMediaUrl, 'Ảnh / video phải tải lên từ form đăng tin')).max(20);

// Tin CTV đăng dùng đúng form & kiểm tra của "Thêm căn" (Story 8.6); trạng thái căn do Quản lý quyết định khi duyệt
export const submissionDataSchema = createApartmentSchema
  .omit({ status: true, availableDate: true })
  .extend({ images: mediaList.default([]), videos: mediaList.optional() });

export const approveSubmissionSchema = z.object({
  // Có căn trùng trong kho → Quản lý chọn gộp tin vào căn đó làm nguồn phụ; bỏ trống = tạo căn mới
  mergeInto: z.string().refine(isValidObjectId, 'Mã căn hộ không hợp lệ').optional(),
});

export const rejectSubmissionSchema = z.object({
  reason: z.string().trim().min(5, 'Lý do từ chối tối thiểu 5 ký tự').max(500),
});

export const listSubmissionsQuerySchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SubmissionData = z.infer<typeof submissionDataSchema>;
