import { apiClient } from './client.js';
import { Apartment, ApartmentPayload, Pagination } from './apartmentApi.js';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
type CtvInfo = { _id: string; name: string; phone: string; ctvCode?: string };

/** Tin CTV đăng chờ duyệt (Story 8.6). `data` cùng cấu trúc form căn hộ (chưa có _id vì chưa vào kho). */
export interface ListingSubmission {
  _id: string;
  ctvId: string | CtvInfo; // Danh sách của Quản lý kèm tên, SĐT CTV
  status: SubmissionStatus;
  data: Apartment;
  rejectReason?: string;
  reviewedAt?: string;
  apartmentId?: string;
  merged?: boolean;
  createdAt: string;
}

export interface DuplicateApartment {
  _id: string;
  title: string;
  price: number;
  address: string;
  reason: string;
}

type ListResult = { items: ListingSubmission[]; pagination: Pagination };

export const submissionApi = {
  create: async (data: ApartmentPayload) => (await apiClient.post('/submissions', data)).data.data as ListingSubmission,
  update: async (id: string, data: ApartmentPayload) => (await apiClient.patch(`/submissions/${id}`, data)).data.data as ListingSubmission,
  withdraw: (id: string) => apiClient.post(`/submissions/${id}/withdraw`),
  listMine: async (params: Record<string, string | number> = {}): Promise<ListResult> => (await apiClient.get('/submissions/mine', { params })).data,
  list: async (params: Record<string, string | number> = {}): Promise<ListResult> => (await apiClient.get('/submissions', { params })).data,
  pendingCount: async (): Promise<number> => (await apiClient.get('/submissions/pending-count')).data.data.count,
  duplicates: async (id: string): Promise<DuplicateApartment[]> => (await apiClient.get(`/submissions/${id}/duplicates`)).data.data,
  approve: (id: string, mergeInto?: string) => apiClient.post(`/submissions/${id}/approve`, { mergeInto }),
  reject: (id: string, reason: string) => apiClient.post(`/submissions/${id}/reject`, { reason }),
};
