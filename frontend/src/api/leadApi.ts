import { apiClient } from './client.js';
import { Apartment } from './apartmentApi.js';

export type LeadStage = 'NEW' | 'CONSULTING' | 'VIEWING' | 'DEPOSITED' | 'LOST';

export type LeadAmenity = 'pool' | 'allowPets' | 'privateWasher' | 'elevator';

export interface LeadRequirements {
  districts: string[]; // Khu vực gõ tay (khách cũ, chat AI)
  zones?: string[]; // Story 11.1
  propertyTypes?: string[];
  maxBudget?: number;
  budgetCurrency?: 'VND' | 'USD';
  amenities?: LeadAmenity[];
  moveInDate?: string;
  bedrooms?: number;
  allowPets?: boolean;
  carParking?: boolean;
}

export interface LeadNote {
  _id: string;
  content: string;
  isSystem: boolean;
  createdAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  phone?: string;
  source: 'MANUAL' | 'AI_CHAT';
  stage: LeadStage;
  viewingAt?: string;
  lostReason?: string;
  requirements: LeadRequirements;
  notes: LeadNote[];
  lastActivityAt: string;
  createdAt: string;
}

export interface CreateLeadPayload {
  name: string;
  phone?: string;
  requirements?: Partial<LeadRequirements>;
  note?: string;
}

export interface ChangeStagePayload {
  stage: LeadStage;
  viewingAt?: string;
  lostReason?: string;
}

// Story 11.1: điểm phù hợp khách ↔ căn
export interface LeadMatch {
  score: number;
  reasons: string[];
}
export interface LeadMatchedApartment extends LeadMatch {
  apartment: Apartment;
}

const unwrap = <T,>(promise: Promise<{ data: { data: T } }>) => promise.then((res) => res.data.data);

// Phễu khách hàng (Story 6.1) — backend chỉ trả khách của người đang đăng nhập
export const leadApi = {
  list: () => unwrap<Lead[]>(apiClient.get('/leads')),
  getById: (id: string) => unwrap<Lead>(apiClient.get(`/leads/${id}`)),
  getMatches: (id: string) => unwrap<LeadMatchedApartment[]>(apiClient.get(`/leads/${id}/matches`)),
  getMatchScore: (id: string, apartmentId: string) => unwrap<LeadMatch>(apiClient.get(`/leads/${id}/matches/${apartmentId}`)),
  create: (payload: CreateLeadPayload) => unwrap<Lead>(apiClient.post('/leads', payload)),
  changeStage: (id: string, payload: ChangeStagePayload) => unwrap<Lead>(apiClient.patch(`/leads/${id}/stage`, payload)),
  addNote: (id: string, content: string) => unwrap<Lead>(apiClient.post(`/leads/${id}/notes`, { content })),
  remove: (id: string) => apiClient.delete(`/leads/${id}`),
};
