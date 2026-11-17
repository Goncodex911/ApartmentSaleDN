import { Schema, model, Document, Types } from 'mongoose';
import { PROPERTY_TYPES, PropertyType, ZONES, Zone } from './listing-taxonomy.js';

// Dịch vụ đã bao trong giá thuê (Story 7.2)
export const INCLUDED_SERVICES = ['WIFI', 'CLEANING', 'ELECTRICITY', 'WATER', 'LAUNDRY'] as const;
export type IncludedService = (typeof INCLUDED_SERVICES)[number];

export interface ISubListing {
  _id?: Types.ObjectId;
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  price?: number;
  ownerContact?: {
    name?: string;
    phone?: string;
    note?: string;
  };
  images?: string[];
  rawContent?: string;
  postedAt?: Date;
}

export interface IApartment extends Document {
  title: string;
  description?: string;
  price: number;
  priceUsd?: number; // Giá USD nếu tin ghi (khách nước ngoài) — giá chuẩn vẫn là price (VNĐ)
  minLeaseMonths?: number; // Số tháng thuê tối thiểu
  includedServices?: IncludedService[];
  location: {
    address: string; // Địa chỉ đầy đủ nội bộ = số nhà/kiệt + tên đường (dùng khử trùng lặp, ước lượng tọa độ)
    street?: string; // Tên đường gửi khách (Story 8.3)
    houseNumber?: string; // Số nhà / kiệt — nội bộ
    mapUrl?: string; // Link Google Maps — nội bộ
    zone?: Zone; // Khu vực theo cách gọi của khách (Story 8.4) — district tự suy ra từ đây
    ward?: string;
    district: string;
    city: string;
    coordinates?: [number, number]; // [kinh độ, vĩ độ] index 2dsphere
  };
  attributes: {
    propertyType?: PropertyType; // Loại căn (Story 8.4)
    area?: number;
    bedrooms: number;
    livingRooms?: number;
    bathrooms: number;
    balcony: boolean;
    furnishing: 'FULL' | 'BASIC' | 'EMPTY';
    elevator: boolean;
    carParking: boolean;
    allowPets: boolean;
    washingMachine: 'PRIVATE' | 'SHARED' | 'NONE';
    pcccStandard: boolean;
    pool?: boolean;
    distanceToBeachM?: number; // Khoảng cách tới biển (mét)
    motorbikeParking?: boolean; // Chỗ để xe máy (ô tô dùng carParking)
    // Story 8.5 — không có giá trị mặc định: căn cũ "chưa có thông tin" khác với "không có"
    gym?: boolean;
    bathtub?: boolean;
    riverView?: boolean;
    seaView?: boolean;
    sauna?: boolean;
  };
  fees: {
    electricity?: number;
    water?: number;
    service?: number;
    parkingMotor?: number;
  };
  images: string[];
  imageHashes?: string[];
  hiddenImages?: string[]; // Ảnh có SĐT nguồn cũ (Gemini Vision phát hiện) — không gửi cho khách (Story 5.2)
  videos?: string[];
  ownerContact: {
    name: string;
    phone: string;
    note?: string;
  };
  subListings: ISubListing[]; // Mảng các nguồn tham chiếu (Story 2.3)
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: Date;
  needsReview?: boolean; // Tin AI bóc chưa chắc chắn (thiếu giá/SĐT/địa chỉ mơ hồ) — chỉ Quản lý thấy, KHÔNG đổi trạng thái
  reviewReason?: string;
  managerId: Types.ObjectId;
  submittedBy?: Types.ObjectId; // CTV đăng tin (Story 8.6) — chỉ Quản lý thấy
  createdAt: Date;
  updatedAt: Date;
}

const subListingSchema = new Schema<ISubListing>(
  {
    sourceType: {
      type: String,
      enum: ['TELEGRAM', 'WHATSAPP', 'ZALO', 'FACEBOOK', 'MANUAL'],
      default: 'MANUAL',
    },
    sourceName: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    price: { type: Number },
    ownerContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      note: { type: String, trim: true },
    },
    images: [{ type: String }],
    rawContent: { type: String },
    postedAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

const apartmentSchema = new Schema<IApartment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0, index: true },
    priceUsd: { type: Number, min: 0 },
    minLeaseMonths: { type: Number, min: 1 },
    includedServices: [{ type: String, enum: INCLUDED_SERVICES }],
    location: {
      address: { type: String, required: true, trim: true },
      street: { type: String, trim: true },
      houseNumber: { type: String, trim: true },
      mapUrl: { type: String, trim: true },
      zone: { type: String, enum: ZONES, index: true },
      ward: { type: String, trim: true },
      district: { type: String, required: true, trim: true, index: true },
      city: { type: String, required: true, default: 'Đà Nẵng', trim: true },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    attributes: {
      propertyType: { type: String, enum: PROPERTY_TYPES, index: true },
      area: { type: Number },
      bedrooms: { type: Number, default: 1, min: 0 },
      livingRooms: { type: Number, default: 0 },
      bathrooms: { type: Number, default: 1, min: 0 },
      balcony: { type: Boolean, default: false },
      furnishing: { type: String, enum: ['FULL', 'BASIC', 'EMPTY'], default: 'BASIC' },
      elevator: { type: Boolean, default: false },
      carParking: { type: Boolean, default: false },
      allowPets: { type: Boolean, default: false },
      washingMachine: { type: String, enum: ['PRIVATE', 'SHARED', 'NONE'], default: 'NONE' },
      pcccStandard: { type: Boolean, default: true },
      pool: { type: Boolean, default: false },
      distanceToBeachM: { type: Number, min: 0 },
      motorbikeParking: { type: Boolean, default: false },
      gym: { type: Boolean },
      bathtub: { type: Boolean },
      riverView: { type: Boolean },
      seaView: { type: Boolean },
      sauna: { type: Boolean },
    },
    fees: {
      electricity: { type: Number },
      water: { type: Number },
      service: { type: Number },
      parkingMotor: { type: Number },
    },
    images: [{ type: String }],
    imageHashes: [{ type: String }],
    hiddenImages: [{ type: String }],
    videos: [{ type: String }],
    ownerContact: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      note: { type: String, trim: true },
    },
    subListings: { type: [subListingSchema], default: [] },
    status: {
      type: String,
      enum: ['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED'],
      default: 'AVAILABLE',
      index: true,
    },
    availableDate: { type: Date },
    needsReview: { type: Boolean, default: false },
    reviewReason: { type: String, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Apartment = model<IApartment>('Apartment', apartmentSchema);

// CTV & khách vãng lai không bao giờ thấy căn đã cho thuê — dùng chung cho danh sách (Epic 2) & tìm kiếm (Epic 4)
export const STATUSES_VISIBLE_TO_CTV = ['AVAILABLE', 'UPCOMING', 'DEPOSITED'];
export const isPrivilegedRole = (role?: string) => role === 'ADMIN' || role === 'MANAGER';

/** Điều kiện lọc status theo quyền. Trả về undefined = không lọc (Admin/Manager xem tất cả). */
export function buildStatusFilter(status: string | undefined, role?: string) {
  if (isPrivilegedRole(role)) return status && status !== 'ALL' ? status : undefined;
  return status && STATUSES_VISIBLE_TO_CTV.includes(status) ? status : { $in: STATUSES_VISIBLE_TO_CTV };
}
