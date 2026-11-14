import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { vnPhone } from '../../utils/validators.js';
import { LEAD_STAGES } from './lead.model.js';

const requirementsSchema = z.object({
  districts: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  maxBudget: z.number().positive('Ngân sách phải lớn hơn 0').optional(),
  moveInDate: z.string().trim().max(50).optional(),
  bedrooms: z.number().int().min(0).max(10).optional(),
  allowPets: z.boolean().optional(),
  carParking: z.boolean().optional(),
});

const noteContent = z.string().trim().min(1, 'Ghi chú không được để trống').max(1000, 'Ghi chú tối đa 1000 ký tự');

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên khách').max(100),
  phone: vnPhone('Số điện thoại khách không hợp lệ').optional().or(z.literal('')),
  requirements: requirementsSchema.optional(),
  note: noteContent.optional(),
});

export const updateLeadSchema = createLeadSchema.omit({ note: true }).partial();

export const changeStageSchema = z
  .object({
    stage: z.enum(LEAD_STAGES),
    viewingAt: z.iso.datetime().optional(),
    lostReason: z.string().trim().max(300).optional(),
    depositedApartmentId: z.string().refine(isValidObjectId, 'Mã căn hộ không hợp lệ').optional(),
  })
  .refine((data) => data.stage !== 'VIEWING' || !!data.viewingAt, {
    message: 'Vui lòng chọn ngày giờ hẹn xem phòng',
    path: ['viewingAt'],
  })
  .refine((data) => data.stage !== 'LOST' || !!data.lostReason, {
    message: 'Vui lòng nhập lý do khách hủy / không hợp',
    path: ['lostReason'],
  });

export const addNoteSchema = z.object({ content: noteContent });

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
