import { apiClient } from './client.js';
import type { PropertyType, Zone } from '../utils/danang.js';

export type IncludedService = 'WIFI' | 'CLEANING' | 'ELECTRICITY' | 'WATER' | 'LAUNDRY';

export interface MatchedApartment {
  _id: string;
  title: string;
  price: number;
  area?: string;
  street?: string; // CE-03.3: tên đường (không số nhà) — CTV cũng thấy
  address?: string;
  image?: string;
  createdAt?: string;
  createdBy?: string;
  reason?: string;
}

export interface CheckDuplicateResponse {
  success: boolean;
  isDuplicate: boolean;
  matchedApartment?: MatchedApartment;
  reason?: string;
}

// Dữ liệu gửi lên khi tạo/sửa căn: khác bản đọc về (VD gửi null để xóa trường khi sửa — Story 8.1)
export type ApartmentPayload = Record<string, unknown>;

// Hợp đồng thuê (Story 11.5)
export interface LeaseInput {
  startDate: string; // "2026-11-19"
  durationMonths: number;
  closedBy?: string;
  tenantName?: string;
  tenantPhone?: string;
}
export interface Lease {
  startDate: string;
  durationMonths: number;
  endDate: string;
  closedBy?: string;
  tenantName?: string;
  tenantPhone?: string;
}

export interface MapPin {
  _id: string;
  price: number;
  priceUsd?: number;
  status: Apartment['status'];
  coordinates: [number, number]; // [kinh độ, vĩ độ]
  street?: string;
  zone?: string;
  district: string;
  propertyType?: string;
  bedrooms: number;
  image?: string;
  approximate: boolean; // Toạ độ ước lượng (chưa có link Google Maps)
  mapUrl?: string; // Story 20.5: link Google Maps chủ nhà gửi — Chỉ đường ưu tiên link này
}

// Story 20.4: kết quả ô tìm địa chỉ trên bản đồ đặt vị trí
export interface GeoPlace {
  label: string;
  detail?: string;
  coordinates: [number, number]; // [kinh độ, vĩ độ]
  source: 'OSM' | 'GOOGLE_LINK' | 'PLUS_CODE';
}

// Story 15.4: điểm mốc đang tìm (tâm + bán kính) & tiện ích Đà Nẵng trên bản đồ
export interface MapLandmark {
  name: string;
  coordinates: [number, number];
  radiusKm: number;
}
export interface MapPinsResult {
  pins: MapPin[];
  withoutLocation: number;
  landmark: MapLandmark | null;
  truncated?: boolean; // Story 15.3: khung nhìn có hơn 500 căn
}
export type PoiGroup = 'BEACH' | 'MARKET' | 'UNIVERSITY' | 'TRANSPORT';
export interface Poi {
  id: string;
  name: string;
  nameEn: string;
  group: PoiGroup;
  coordinates: [number, number];
}

export interface Apartment {
  _id: string;
  title: string;
  description?: string;
  price: number;
  priceUsd?: number;
  minLeaseMonths?: number;
  includedServices?: IncludedService[];
  location: {
    address: string;
    street?: string; // Tên đường gửi khách (Story 8.3)
    houseNumber?: string; // Nội bộ
    mapUrl?: string; // Nội bộ
    zone?: Zone; // Khu vực theo cách gọi của khách (Story 8.4)
    ward?: string;
    district: string;
    city: string;
    coordinates?: [number, number];
    geoPrecision?: 'EXACT' | 'STREET' | 'AREA'; // Story 15.6 / 15.7
    buildingName?: string; // Story 15.7
  };
  attributes: {
    propertyType?: PropertyType;
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
    distanceToBeachM?: number; // mét
    motorbikeParking?: boolean;
    gym?: boolean; // Story 8.5 — căn cũ chưa có (undefined)
    bathtub?: boolean;
    riverView?: boolean;
    seaView?: boolean;
    sauna?: boolean;
  };
  fees?: {
    electricity?: number;
    water?: number;
    service?: number;
    parkingMotor?: number;
  };
  images: string[];
  hiddenImages?: string[]; // Ảnh có SĐT nguồn cũ — không gửi khách (Story 5.2)
  videos?: string[];
  ownerContact?: {
    name?: string; // Story 13.7: tùy chọn — căn nguồn liên kết
    phone?: string;
    note?: string;
  };
  verification?: { flaggedAt: string; reasons: string[] }; // Story 13.6: ≥ 2 người báo lỗi → "Chờ xác minh"
  subListings?: Array<{
    _id?: string;
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
    postedAt?: string;
  }>;
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: string;
  needsReview?: boolean; // Chỉ Quản lý/Admin nhận được (backend ẩn với CTV)
  lease?: Lease; // Story 11.5 — chỉ Quản lý/Admin nhận được
  reviewReason?: string;
  distanceKm?: number;
  nearestLandmark?: string;
  managerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Landmark {
  id: string;
  name: string;
  shortName: string;
  district: string;
  coordinates: [number, number];
  category: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MapQAPendingResponse {
  apartments: Apartment[];
  totalCount: number;
  exactCount: number;
  pendingCount: number;
  page: number;
  limit: number;
}

export const apartmentApi = {
  getApartments: async (params: Record<string, any> = {}) => {
    const res = await apiClient.get('/apartments', { params });
    return res.data;
  },

  // Story 11.2: ghim bản đồ theo cùng bộ lọc (tối đa 500 căn, dữ liệu nhẹ)
  // natural: hiểu câu tự nhiên như danh sách (Story 19.7) — route riêng có giới hạn tần suất vì gọi Gemini
  searchGeo: async (q: string): Promise<GeoPlace[]> => (await apiClient.get('/apartments/search/geo', { params: { q } })).data.data,

  getMapPins: async (params: Record<string, any> = {}, natural = false): Promise<MapPinsResult> => {
    const res = await apiClient.get(natural ? '/apartments/search/pins/natural' : '/apartments/search/pins', { params });
    return res.data.data;
  },

  searchApartments: async (params: Record<string, any> = {}) => {
    const res = await apiClient.get('/apartments/search', { params });
    return res.data;
  },

  searchNaturalApartments: async (query: string, params: Record<string, any> = {}) => {
    const res = await apiClient.post('/apartments/search/natural', { query }, { params });
    return res.data;
  },

  getPois: async (): Promise<Poi[]> => (await apiClient.get('/apartments/search/pois')).data.data,

  getLandmarks: async () => {
    const res = await apiClient.get('/apartments/search/landmarks');
    return res.data;
  },

  getApartmentById: async (id: string) => {
    const res = await apiClient.get(`/apartments/${id}`);
    return res.data;
  },

  createApartment: async (data: ApartmentPayload) => {
    const res = await apiClient.post('/apartments', data);
    return res.data;
  },

  updateApartment: async (id: string, data: ApartmentPayload) => {
    const res = await apiClient.put(`/apartments/${id}`, data);
    return res.data;
  },

  updateStatus: async (id: string, data: { status: string; availableDate?: string; lease?: LeaseInput }) => {
    const res = await apiClient.patch(`/apartments/${id}/status`, data);
    return res.data;
  },

  // Story 11.5: gia hạn hợp đồng thêm 1 / 3 / 6 / 12 tháng
  renewLease: async (id: string, months: number): Promise<Apartment> => {
    const res = await apiClient.patch(`/apartments/${id}/lease/renew`, { months });
    return res.data.data;
  },

  deleteApartment: async (id: string) => {
    const res = await apiClient.delete(`/apartments/${id}`);
    return res.data;
  },

  uploadMedia: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    const res = await apiClient.post('/apartments/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  addSubListing: async (apartmentId: string, data: any) => {
    const res = await apiClient.post(`/apartments/${apartmentId}/sub-listings`, data);
    return res.data;
  },

  removeSubListing: async (apartmentId: string, subId: string) => {
    const res = await apiClient.delete(`/apartments/${apartmentId}/sub-listings/${subId}`);
    return res.data;
  },

  // Story 13.10: Kiểm tra căn hộ nghi trùng trong kho
  checkDuplicate: async (payload: {
    title?: string;
    price: number;
    location: { street?: string; houseNumber?: string | null; address?: string; zone?: string; district?: string };
    attributes?: { propertyType?: string; bedrooms?: number };
    ownerContact?: { phone?: string };
    excludeId?: string;
  }, signal?: AbortSignal): Promise<CheckDuplicateResponse> => {
    const res = await apiClient.post<CheckDuplicateResponse>('/apartments/check-duplicate', payload, { signal });
    return res.data;
  },

  // Story 17.6: Lấy danh sách căn cần chuẩn hóa vị trí bản đồ
  getMapQAPending: async (params: { zone?: string; page?: number; limit?: number } = {}): Promise<MapQAPendingResponse> => {
    const res = await apiClient.get('/apartments/admin/map-qa/pending', { params });
    return res.data.data;
  },

  // Story 17.6: Chuẩn hóa tọa độ vị trí 1-chạm
  calibrateLocation: async (id: string, coordinates: [number, number]): Promise<Apartment> => {
    const res = await apiClient.patch(`/apartments/${id}/calibrate-location`, { coordinates });
    return res.data.data;
  },
};

