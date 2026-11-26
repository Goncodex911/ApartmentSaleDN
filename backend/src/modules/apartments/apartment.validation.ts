import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { vnPhone, toPatchSchema, DeepPartial } from '../../utils/validators.js';
import { INCLUDED_SERVICES } from './apartment.model.js';
import { isGoogleMapsUrl } from '../../utils/google-maps.js';
import { LEASE_STEPS, PROPERTY_TYPES, ZONES } from './listing-taxonomy.js';
import { inDanang } from '../search/landmarks.data.js';

const statusEnum = z.enum(['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED']);

export const createApartmentSchema = z.object({
  title: z.string().min(5, 'Tiêu đề phải có ít nhất 5 ký tự'),
  description: z.string().optional(),
  price: z.number().positive('Giá thuê phải lớn hơn 0'),
  priceUsd: z.number().positive('Giá USD phải lớn hơn 0').optional(),
  minLeaseMonths: z
    .number()
    .refine((months) => (LEASE_STEPS as readonly number[]).includes(months), 'Thuê tối thiểu chỉ nhận 1, 3, 6 hoặc 12 tháng')
    .optional(),
  includedServices: z.array(z.enum(INCLUDED_SERVICES)).optional(),
  location: z.object({
    // Story 8.3: form gửi tên đường + số nhà, service tự ghép address; client cũ (extension) vẫn gửi address được
    street: z.string().trim().min(2, 'Tên đường không được để trống').max(120).optional(),
    houseNumber: z.string().trim().max(60).optional(),
    mapUrl: z.string().trim().max(500).refine(isGoogleMapsUrl, 'Link Google Maps không hợp lệ (chỉ nhận link https của Google Maps)').optional(),
    address: z.string().trim().min(2, 'Địa chỉ không được để trống').optional(),
    ward: z.string().optional(),
    // Story 8.4: chọn khu vực → quận tự suy ra; chỉ khu vực "Khác" mới cần gửi quận
    zone: z.enum(ZONES, 'Vui lòng chọn khu vực'),
    district: z.string().min(2, 'Quận/Huyện không được để trống').optional(),
    city: z.string().default('Đà Nẵng'),
    // Story 15.7: ghim kéo tay / GPS trong form → vị trí chính xác; chỉ nhận trong khung Đà Nẵng mở rộng (gồm Hội An)
    coordinates: z
      .tuple([z.number(), z.number()])
      .refine(inDanang, 'Vị trí trên bản đồ phải nằm trong Đà Nẵng')
      .optional(),
    buildingName: z.string().trim().max(100, 'Tên tòa nhà tối đa 100 ký tự').optional(), // Story 15.7
  }),
  attributes: z
    .object({
      propertyType: z.enum(PROPERTY_TYPES, 'Vui lòng chọn loại căn'),
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
      pool: z.boolean().default(false),
      distanceToBeachM: z.number().int().min(0).max(100000).optional(),
      motorbikeParking: z.boolean().default(false),
      gym: z.boolean().optional(), // Story 8.5
      bathtub: z.boolean().optional(),
      riverView: z.boolean().optional(),
      seaView: z.boolean().optional(),
      sauna: z.boolean().optional(),
    }), // Bắt buộc gửi: có loại căn (Story 8.4)
  fees: z
    .object({
      electricity: z.number().min(0).optional(),
      water: z.number().min(0).optional(),
      service: z.number().min(0).optional(),
      parkingMotor: z.number().min(0).optional(),
    })
    .optional(),
  images: z.array(z.url('Link ảnh không hợp lệ')).default([]),
  videos: z.array(z.url('Link video không hợp lệ')).optional(),
  // Story 13.7: căn nguồn liên kết / chủ chỉ liên hệ qua Zalo → tên và SĐT chủ được bỏ trống; có nhập SĐT thì vẫn kiểm tra định dạng
  ownerContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      phone: vnPhone('Số điện thoại chủ nhà không đúng định dạng VN').or(z.literal('')).optional(),
      note: z.string().optional(),
    })
    .optional(),
  status: statusEnum.default('AVAILABLE'),
  availableDate: z.iso.datetime().optional(),
});

export type CreateApartmentInput = z.infer<typeof createApartmentSchema>;

// Cập nhật một phần: chỉ các trường gửi lên mới được sửa, trường lồng nhau cũng được phép gửi một phần
export const updateApartmentSchema = toPatchSchema(createApartmentSchema) as z.ZodType<DeepPartial<CreateApartmentInput>>;
export type UpdateApartmentInput = DeepPartial<CreateApartmentInput>;

// Schema cập nhật nhanh 1-Click trạng thái phòng
const leaseMonths = z.number().int().refine((value) => (LEASE_STEPS as readonly number[]).includes(value), 'Thời hạn chỉ nhận 1, 3, 6 hoặc 12 tháng');

// Hợp đồng nhập khi chuyển sang Đã cho thuê (Story 11.5)
const leaseSchema = z.object({
  startDate: z.iso.date('Ngày bắt đầu không hợp lệ'),
  durationMonths: leaseMonths,
  closedBy: z.string().refine(isValidObjectId, 'CTV chốt căn không hợp lệ').optional(),
  tenantName: z.string().trim().max(100).optional(),
  tenantPhone: vnPhone('SĐT khách thuê không đúng định dạng VN').optional().or(z.literal('')),
});

export const updateStatusSchema = z
  .object({
    status: statusEnum,
    availableDate: z.iso.datetime().optional(),
    lease: leaseSchema.optional(),
  })
  .refine((data) => (data.status === 'UPCOMING' ? !!data.availableDate : true), {
    message: 'Vui lòng chọn ngày dự kiến phòng sẽ trống khi chuyển sang trạng thái Sắp trống (UPCOMING)',
  })
  .refine((data) => !data.lease || data.status === 'RENTED', { message: 'Chỉ nhập hợp đồng khi căn Đã cho thuê' });

export const renewLeaseSchema = z.object({ months: leaseMonths });

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// Schema đính kèm nguồn tham chiếu (Story 2.3)
export const addSubListingSchema = z.object({
  sourceType: z.enum(['TELEGRAM', 'WHATSAPP', 'ZALO', 'FACEBOOK', 'MANUAL']).default('MANUAL'),
  sourceName: z.string().optional(),
  sourceUrl: z.url('Link bài đăng không hợp lệ').optional().or(z.literal('')),
  price: z.number().positive('Giá phòng phải lớn hơn 0').optional(),
  ownerContact: z
    .object({
      name: z.string().optional(),
      phone: vnPhone('SĐT không đúng định dạng VN').optional(),
      note: z.string().optional(),
    })
    .optional(),
  images: z.array(z.url('Link ảnh không hợp lệ')).default([]),
  rawContent: z.string().optional(),
  postedAt: z.iso.datetime().optional(),
  setAsMasterPrice: z.boolean().default(false), // Tùy chọn: Chọn giá này làm giá đại diện cho căn Master
});

export type AddSubListingInput = z.infer<typeof addSubListingSchema>;

// Story 14.5: số chữ ký tải lên cần xin (1 chữ ký = 1 file), tối đa 10 / lần — khớp giới hạn 10 file của /upload-media
export const uploadSignatureSchema = z.object({ count: z.number().int().min(1).max(10).default(1) });

// Story 19.3: hiệu chỉnh vị trí — đúng 2 SỐ hữu hạn [kinh độ, vĩ độ] (chuỗi "108.2" trước đây lọt qua rồi lỗi 500)
export const calibrateLocationSchema = z.object({
  coordinates: z.tuple([z.number().finite(), z.number().finite()], { error: 'Tọa độ không hợp lệ' }),
});
