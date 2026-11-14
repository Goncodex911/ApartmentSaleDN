import { apiClient } from './client.js';
import { Apartment } from './apartmentApi.js';

export interface ShareLinkInfo {
  url: string;
  code: string;
  views: number;
  lastViewedAt?: string;
}

// Dữ liệu công khai của trang xem phòng (Story 5.3) — không có thông tin chủ nhà
export interface PublicListing {
  title: string;
  price: number;
  deposit: number;
  fees: NonNullable<Apartment['fees']>;
  attributes: Omit<Apartment['attributes'], 'livingRooms'>;
  location: { ward?: string; district: string; city: string; approximateCenter: [number, number] | null };
  images: string[];
  status: Apartment['status'];
  availableDate?: string;
  ctv: { name: string; phone: string; zaloLink?: string; avatarUrl?: string; greetingMessage?: string };
}

export const shareApi = {
  createLink: async (apartmentId: string): Promise<ShareLinkInfo> => {
    const res = await apiClient.post('/share/links', { apartmentId });
    return res.data.data;
  },

  getPublicListing: async (code: string): Promise<PublicListing> => {
    const res = await apiClient.get(`/share/public/${code}`);
    return res.data.data;
  },

  getWatermarkedPhoto: async (apartmentId: string, index: number): Promise<Blob> => {
    const res = await apiClient.get(`/share/apartments/${apartmentId}/photos/${index}`, { responseType: 'blob' });
    return res.data;
  },

  downloadPhotosZip: async (apartmentId: string): Promise<Blob> => {
    const res = await apiClient.get(`/share/apartments/${apartmentId}/photos.zip`, { responseType: 'blob' });
    return res.data;
  },
};
