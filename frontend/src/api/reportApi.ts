import { apiClient } from './client.js';
import { Apartment } from './apartmentApi.js';

// Story 13.6 (gộp 11.4b) — CTV báo lỗi tin, Quản lý / Admin xử lý
export type ReportReason = 'RENTED' | 'PRICE_CHANGED' | 'UNREACHABLE' | 'WRONG_PHOTOS';
export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'RENTED', label: 'Đã cho thuê / Hết phòng' },
  { id: 'PRICE_CHANGED', label: 'Chủ tăng giá / Sai giá' },
  { id: 'UNREACHABLE', label: 'Không liên lạc được chủ nhà' },
  { id: 'WRONG_PHOTOS', label: 'Ảnh không đúng thực tế' },
];
export const reasonLabel = (reason: ReportReason) => REPORT_REASONS.find((item) => item.id === reason)?.label ?? reason;

export interface ListingReport {
  _id: string;
  reason: ReportReason;
  note?: string;
  newPrice?: number;
  createdAt: string;
  reporterId: { _id: string; name: string; ctvCode: string; trustScore: number } | null;
}
export interface ModerationItem extends Pick<Apartment, '_id' | 'title' | 'price' | 'status' | 'verification'> {
  image?: string;
  canResolve: boolean;
  reports: ListingReport[];
}
export type ResolveAction = { action: 'MARK_RENTED' } | { action: 'UPDATE_PRICE'; price: number } | { action: 'DISMISS'; wrongReport?: boolean };

export const reportApi = {
  report: async (apartmentId: string, data: { reason: ReportReason; note?: string; newPrice?: number }) => {
    await apiClient.post(`/reports/${apartmentId}`, data);
  },
  listForApartment: async (apartmentId: string): Promise<ListingReport[]> => (await apiClient.get(`/reports/${apartmentId}`)).data.data,
  queue: async (): Promise<ModerationItem[]> => (await apiClient.get('/reports')).data.data,
  resolve: async (apartmentId: string, data: ResolveAction): Promise<{ reporters: number; trustDelta: number }> =>
    (await apiClient.post(`/reports/${apartmentId}/resolve`, data)).data.data,
};
