import { z } from 'zod';

const vnPhoneRegex = /(84|0[35789])([0-9]{8})\b/;

export const createApartmentSchema = z.object({
  title: z.string().min(5, 'Tiêu đề phải có ít nhất 5 ký tự'),
  description: z.string().optional(),
  price: z.number().positive('Giá thuê phải lớn hơn 0'),
  deposit: z.number().min(0, 'Tiền cọc không được âm').default(0),
  commission: z
    .object({
      type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
      value: z.number().min(0, 'Giá trị hoa hồng không được âm').default(0),
    })
    .default({ type: 'PERCENT', value: 0 }),
  location: z.object({
    address: z.string().min(2, 'Địa chỉ không được để trống'),
    ward: z.string().optional(),
    district: z.string().min(2, 'Quận/Huyện không được để trống'),
    city: z.string().default('Hà Nội'),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
  }),
  attributes: z
    .object({
      area: z.number().positive().optional(),
      bedrooms: z.number().int().min(0).default(1),
      livingRooms: z.number().int().min(0).default(0),
      bathrooms: z.number().int().min(0).default(1),
      balcony: z.boolean().default(false),
      furnishing: z.enum(['FULL', 'BASIC', 'EMPTY']).default('BASIC'),
      elevator: z.boolean().default(false),
      carParking: z.boolean().default(false),
      allowPets: z.boolean().default(false),
      washingMachine: z.enum(['PRIVATE', 'SHARED', 'NONE']).default('NONE'),
      pcccStandard: z.boolean().default(true),
    })
    .default({}),
  fees: z
    .object({
      electricity: z.number().min(0).optional(),
      water: z.number().min(0).optional(),
      service: z.number().min(0).optional(),
      parkingMotor: z.number().min(0).optional(),
    })
    .optional(),
  images: z.array(z.string().url('Link ảnh không hợp lệ')).default([]),
  videos: z.array(z.string().url('Link video không hợp lệ')).optional(),
  ownerContact: z.object({
    name: z.string().min(2, 'Tên chủ nhà không được để trống'),
    phone: z.string().regex(vnPhoneRegex, 'Số điện thoại chủ nhà không đúng định dạng VN'),
    note: z.string().optional(),
  }),
  status: z.enum(['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED']).default('AVAILABLE'),
  availableDate: z.string().datetime().optional().or(z.date().optional()),
});

export const updateApartmentSchema = createApartmentSchema.partial();

// Schema cập nhật nhanh 1-Click trạng thái phòng
export const updateStatusSchema = z
  .object({
    status: z.enum(['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED']),
    availableDate: z.string().datetime().optional().or(z.date().optional()),
  })
  .refine(
    (data) => (data.status === 'UPCOMING' ? !!data.availableDate : true),
    { message: 'Vui lòng chọn ngày dự kiến phòng sẽ trống khi chuyển sang trạng thái Sắp trống (UPCOMING)' }
  );

export type CreateApartmentInput = z.infer<typeof createApartmentSchema>;
export type UpdateApartmentInput = z.infer<typeof updateApartmentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// Schema đính kèm nguồn tham chiếu (Story 2.3)
export const addSubListingSchema = z.object({
  sourceType: z.enum(['TELEGRAM', 'ZALO', 'FACEBOOK', 'MANUAL']).default('MANUAL'),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url('Link bài đăng không hợp lệ').optional().or(z.literal('')),
  price: z.number().positive('Giá phòng phải lớn hơn 0').optional(),
  ownerContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().regex(vnPhoneRegex, 'SĐT không đúng định dạng VN').optional(),
      note: z.string().optional(),
    })
    .optional(),
  images: z.array(z.string().url('Link ảnh không hợp lệ')).default([]),
  rawContent: z.string().optional(),
  postedAt: z.string().datetime().optional().or(z.date().optional()),
  setAsMasterPrice: z.boolean().default(false), // Tùy chọn: Chọn giá này làm giá đại diện cho căn Master
});

export type AddSubListingInput = z.infer<typeof addSubListingSchema>;

