import { apiClient } from './client.js';
import { Apartment } from './apartmentApi.js';

export interface ShareLinkInfo {
  url: string;
  code: string;
  views: number;
  lastViewedAt?: string;
  usdRate?: number; // Story 19.1: tỷ giá cấu hình để quy đổi USD trong bài WhatsApp
}

// Mỗi căn chỉ có 1 link / CTV (backend upsert) → nhớ trong phiên để bài Zalo / WhatsApp không gọi lại nhiều lần
const linkCache = new Map<string, Promise<ShareLinkInfo>>();
const currentUserId = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?._id ?? '';
  } catch {
    return '';
  }
};

// Dữ liệu công khai của trang xem phòng (Story 5.3) — không có thông tin chủ nhà
export interface PublicListing {
  title: string;
  price: number;
  priceUsd?: number;
  minLeaseMonths?: number;
  includedServices: NonNullable<Apartment['includedServices']>;
  fees: NonNullable<Apartment['fees']>;
  attributes: Omit<Apartment['attributes'], 'livingRooms'>;
  // Story 15.5: vị trí đúng + địa chỉ đầy đủ; precision EXACT → ghim, STREET / AREA → vòng gần đúng
  location: {
    street?: string;
    fullAddress: string;
    buildingName?: string;
    zone?: string;
    ward?: string;
    district: string;
    city: string;
    coordinates: [number, number] | null;
    precision: 'EXACT' | 'STREET' | 'AREA';
  };
  nearby: { group: 'BEACH' | 'MARKET' | 'NIGHTLIFE'; name: string; nameEn: string; distanceM: number; walkMinutes?: number }[];
  images: string[];
  status: Apartment['status'];
  availableDate?: string;
  usdRate?: number; // Story 11.6: tỷ giá cho ước tính chi phí
  ctv: { name: string; phone: string; zaloLink?: string; avatarUrl?: string; greetingMessage?: string };
  company?: { hotline?: string; zaloOaUrl?: string }; // Story 13.5: liên hệ công ty (Admin cấu hình)
}

export const shareApi = {
  createLink: async (apartmentId: string): Promise<ShareLinkInfo> => {
    const res = await apiClient.post('/share/links', { apartmentId });
    return res.data.data;
  },

  /** Link chia sẻ đã lưu trong phiên (lỗi → bỏ khỏi bộ nhớ để lần sau thử lại) */
  getLink: (apartmentId: string): Promise<ShareLinkInfo> => {
    // Khóa theo cả người dùng: đăng xuất không tải lại trang → CTV khác đăng nhập trên cùng máy không dùng nhầm link của người trước
    const key = `${currentUserId()}:${apartmentId}`;
    let pending = linkCache.get(key);
    if (!pending) {
      pending = shareApi.createLink(apartmentId);
      pending.catch(() => linkCache.delete(key));
      linkCache.set(key, pending);
    }
    return pending;
  },

  getPublicListing: async (code: string): Promise<PublicListing> => {
    const res = await apiClient.get(`/share/public/${code}`);
    return res.data.data;
  },

};
