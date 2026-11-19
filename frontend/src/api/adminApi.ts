import { apiClient } from './client.js';
import { User } from './authApi.js';

// Story 13.3 — nhật ký truy vết
export type AuditAction =
  | 'UNMASK_OWNER_CONTACT'
  | 'CHANGE_STATUS'
  | 'UPDATE_PRICE'
  | 'DELETE_APARTMENT'
  | 'APPROVE_SUBMISSION'
  | 'REJECT_SUBMISSION'
  | 'CHANGE_USER_STATUS'
  | 'CHANGE_ROLE'
  | 'RESET_PASSWORD'
  | 'CHANGE_PASSWORD'
  | 'DISMISS_REPORT';

export interface AuditLogEntry {
  _id: string;
  userId: string;
  userName: string;
  userRole: User['role'];
  action: AuditAction;
  targetType: 'APARTMENT' | 'SUBMISSION' | 'USER';
  targetId: string;
  targetTitle: string;
  details?: { from?: string | number; to?: string | number; reason?: string; price?: number; status?: string; canReport?: boolean; reporters?: number; wrongReport?: boolean };
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Story 13.1 — số liệu trang Quản trị
export interface DashboardStats {
  apartments: { total: number; byStatus: Record<string, number>; byZone: Record<string, number>; byPrice: Record<string, number>; needsReview: number };
  members: { collaborators: number; managers: number; pending: number; blocked: number };
  ingestion24h: { received: number; created: number; merged: number; notRental: number; failed: number };
  market: { publicViews: number; openLeads: number; newLeads7d: number; pendingSubmissions: number };
}

// Story 13.4 — hiệu suất CTV
export type PerformanceRange = 'this_month' | 'last_month' | 'all';
export interface BrokerPerformance {
  _id: string;
  name: string;
  phone: string;
  ctvCode: string;
  submitted: number;
  approved: number;
  links: number;
  views: number; // Toàn thời gian (link không lưu mốc từng lượt xem)
  leadsCreated: number;
  leadsOpen: number;
  deals: number;
  lastActivityAt: string | null;
  inactive: boolean;
  rank: 1 | 2 | 3 | null;
}

// Story 13.5 — cấu hình hệ thống
export type ReviewPolicy = 'FLAG_ONLY' | 'SAFE' | 'FAST_LANE';
export interface TelegramSource {
  chatId: string;
  name: string;
  active: boolean;
  addedAt: string;
  weeklyCount: number;
}
export interface SystemSettings {
  reviewPolicy: ReviewPolicy;
  hotline: string;
  zaloOaUrl: string;
  telegramSources: TelegramSource[];
  envFallbackCount: number; // Số nhóm đang lấy từ biến môi trường (khi trên web chưa thêm nhóm nào)
}
const settingsUrl = '/admin/settings';
const sourceUrl = (chatId: string) => `${settingsUrl}/telegram-sources/${encodeURIComponent(chatId)}`;

export const adminApi = {
  getSettings: async (): Promise<SystemSettings> => (await apiClient.get(settingsUrl)).data.data,
  updateSettings: async (data: Partial<Pick<SystemSettings, 'reviewPolicy' | 'hotline' | 'zaloOaUrl'>>): Promise<SystemSettings> =>
    (await apiClient.put(settingsUrl, data)).data.data,
  addTelegramSource: async (data: { name: string; chatId: string }): Promise<SystemSettings> => (await apiClient.post(`${settingsUrl}/telegram-sources`, data)).data.data,
  toggleTelegramSource: async (chatId: string, active: boolean): Promise<SystemSettings> => (await apiClient.patch(sourceUrl(chatId), { active })).data.data,
  removeTelegramSource: async (chatId: string): Promise<SystemSettings> => (await apiClient.delete(sourceUrl(chatId))).data.data,

  getBrokerPerformance: async (range: PerformanceRange): Promise<BrokerPerformance[]> => {
    const res = await apiClient.get('/admin/broker-performance', { params: { range } });
    return res.data.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get('/admin/dashboard-stats');
    return res.data.data;
  },

  // [ADMIN] action: 1 hoặc nhiều hành động, cách nhau dấu phẩy
  listAuditLogs: async (params: { action?: string; search?: string; page?: number }): Promise<{ items: AuditLogEntry[]; total: number }> => {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return { items: res.data.data, total: res.data.meta.total };
  },
};
