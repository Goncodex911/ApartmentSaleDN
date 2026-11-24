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
  | 'DISMISS_REPORT'
  // Story 16.2
  | 'LOGIN' | 'LOGIN_FAILED' | 'LOGIN_BLOCKED' | 'LOGOUT'
  | 'CREATE_APARTMENT' | 'UPDATE_APARTMENT' | 'ADD_SUBLISTING' | 'REMOVE_SUBLISTING' | 'RENEW_LEASE' | 'AI_IMPORT'
  | 'SUBMIT_LISTING' | 'UPDATE_SUBMISSION' | 'WITHDRAW_SUBMISSION' | 'CREATE_REPORT' | 'RESOLVE_REPORT'
  | 'CREATE_SHARE_LINK' | 'UPDATE_SETTINGS' | 'ADD_TELEGRAM_SOURCE' | 'TOGGLE_TELEGRAM_SOURCE' | 'REMOVE_TELEGRAM_SOURCE' | 'EXPORT_AUDIT_CSV'
  | 'CREATE_USER' | 'UPDATE_USER' | 'ADD_USER_NOTE' | 'DELETE_USER_NOTE' | 'REVOKE_SESSION' | 'REVOKE_ALL_SESSIONS' | 'RESTORE_APARTMENT' | 'PURGE_APARTMENT' | 'SEND_ANNOUNCEMENT' | 'REVOKE_ANNOUNCEMENT';
export type AuditCategory = 'AUTH' | 'INVENTORY' | 'SUBMISSION' | 'SHARE' | 'ACCOUNT' | 'ADMIN';
export type AuditSeverity = 'NORMAL' | 'IMPORTANT' | 'SECURITY';
export type AuditChange = { from: unknown; to: unknown };

export interface AuditLogEntry {
  _id: string;
  userId?: string;
  userName: string;
  userRole: User['role'] | '';
  action: AuditAction;
  category?: AuditCategory; // Mục ghi trước Story 16.2 không có
  severity?: AuditSeverity;
  targetType: 'APARTMENT' | 'SUBMISSION' | 'USER' | 'SETTINGS' | 'SHARE_LINK' | 'REPORT' | 'AUTH';
  targetId?: string;
  targetTitle: string;
  details?: { from?: string | number; to?: string | number; reason?: string; price?: number; status?: string; canReport?: boolean; reporters?: number; wrongReport?: boolean; changes?: Record<string, AuditChange>; [key: string]: unknown };
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditQuery = { action?: string; category?: string; severity?: string; userId?: string; search?: string; from?: string; to?: string };

// Story 13.1 — số liệu trang Quản trị
export interface DashboardStats {
  apartments: { total: number; byStatus: Record<string, number>; byZone: Record<string, number>; byPrice: Record<string, number>; needsReview: number };
  members: { collaborators: number; managers: number; pending: number; blocked: number };
  ingestion24h: { received: number; created: number; merged: number; notRental: number; failed: number };
  market: { publicViews: number; openLeads: number; newLeads7d: number; pendingSubmissions: number };
  openAlerts?: number; // Story 16.5
}

// Story 16.5 — cảnh báo bảo mật
export type AlertRule = 'OWNER_CONTACT_SCRAPE' | 'LOGIN_BRUTE_FORCE' | 'MASS_DELETE' | 'NEW_DEVICE_PRIVILEGED';
export interface SecurityAlert {
  _id: string;
  rule: AlertRule;
  severity: 'IMPORTANT' | 'SECURITY';
  userId?: string;
  subject: string;
  message: string;
  count: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: { _id: string; name: string };
}
// Story 16.7 — Thùng rác & Kho tồn
export interface TrashItem {
  _id: string;
  title: string;
  price: number;
  status: string;
  location: { zone?: string; district?: string };
  images?: string[];
  deletedAt: string;
  deletedBy?: { _id: string; name: string };
  daysLeft: number;
}
export interface StaleItem {
  _id: string;
  title: string;
  price: number;
  status: 'AVAILABLE' | 'UPCOMING';
  location: { zone?: string; district?: string };
  updatedAt: string;
  managerId?: { _id: string; name: string };
  needsReview?: boolean;
}
export type StaleQuery = { days: 30 | 60 | 90; zone?: string };
export type BulkStaleInput = { action: 'UPCOMING'; ids: string[]; availableDate: string } | { action: 'NEEDS_REVIEW' | 'DELETE'; ids: string[] };
// Story 16.8a — sức khỏe dịch vụ
export type ServiceState = 'NOT_CONFIGURED' | 'UNKNOWN' | 'OK' | 'DEGRADED' | 'DOWN' | 'KEY_INVALID';
export interface ServiceStatus {
  service: 'mongo' | 'gemini' | 'cloudinary' | 'telegram' | 'nominatim' | 'carto';
  state: ServiceState;
  env: { vars: string[]; where: 'Render' | 'Frontend' };
  lastCheckedAt: string | null;
  latencyMs: number | null;
  message: string | null;
  calls24h: number;
  rateLimited24h: number;
  errors24h: number;
  lastFailureAt: string | null;
}
// Story 16.8b — đồng hồ hạn mức (mỗi nguồn có thể trả { error } riêng)
type Failed = { error: string };
type Level = 'ok' | 'warn' | 'danger';
export interface QuotaMeters {
  mongo: { usedMb: number; limitMb: number; ratio: number; level: Level; collections: { name: string; mb: number }[] | null } | Failed;
  cloudinary: { creditsUsed: number; creditsLimit: number; ratio: number; level: Level; storageMb: number; bandwidthMb: number; transformations: number } | Failed | null;
  gemini: { model: string; callsLastHour: number; calls24h: number; rateLimited24h: number; lastFailureAt: string | null };
  nominatim: { calls24h: number; rateLimited24h: number; errors24h: number; cache: { found: number; missed: number } | Failed };
  telegram: { lastReceivedAt: string | null; sources: { name: string; count: number }[] } | Failed | null;
}
// Story 16.9 — thông báo chung
export type Audience = 'ALL' | 'COLLABORATOR' | 'MANAGER';
export interface Announcement {
  _id: string;
  title: string;
  body: string;
  audience: Audience;
  pinnedUntil: string;
  sentByName: string;
  recipientCount: number;
  seenCount: number;
  viaTelegram: boolean;
  revokedAt?: string;
  createdAt: string;
}
export type SendAnnouncementInput = { title: string; body: string; audience: Audience; pinDays: 1 | 3 | 7; viaTelegram: boolean };
export type AlertThresholds = { ownerContactPerHour: number; deletesPer10Min: number };

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
  alertThresholds: AlertThresholds; // Story 16.5
  envFallbackCount: number; // Số nhóm đang lấy từ biến môi trường (khi trên web chưa thêm nhóm nào)
}
const settingsUrl = '/admin/settings';
const sourceUrl = (chatId: string) => `${settingsUrl}/telegram-sources/${encodeURIComponent(chatId)}`;

export const adminApi = {
  getSettings: async (): Promise<SystemSettings> => (await apiClient.get(settingsUrl)).data.data,
  updateSettings: async (data: Partial<Pick<SystemSettings, 'reviewPolicy' | 'hotline' | 'zaloOaUrl' | 'alertThresholds'>>): Promise<SystemSettings> =>
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

  // [ADMIN] Story 16.9: thông báo chung (phần thành viên xem ở announcementApi)
  listAnnouncements: async (page = 1): Promise<{ items: Announcement[]; total: number }> => {
    const res = await apiClient.get('/admin/announcements', { params: { page } });
    return { items: res.data.data, total: res.data.meta.total };
  },
  sendAnnouncement: async (input: SendAnnouncementInput): Promise<Announcement> => (await apiClient.post('/admin/announcements', input)).data.data,
  revokeAnnouncement: async (id: string) => apiClient.post(`/admin/announcements/${id}/revoke`),
  activeAnnouncement: async (): Promise<Pick<Announcement, '_id' | 'title' | 'body' | 'createdAt' | 'sentByName'> | null> => (await apiClient.get('/announcements/active')).data.data,
  dismissAnnouncement: async (id: string) => apiClient.post(`/announcements/${id}/dismiss`),

  // [ADMIN] Story 16.8a: sức khỏe dịch vụ
  healthStatus: async (): Promise<{ services: ServiceStatus[]; dailyJobsLastRun: string | null }> => (await apiClient.get('/admin/health/status')).data.data,
  healthQuotas: async (): Promise<QuotaMeters> => (await apiClient.get('/admin/health/quotas')).data.data,
  healthPing: async (services?: ServiceStatus['service'][]): Promise<ServiceStatus[]> => (await apiClient.post('/admin/health/ping', { services })).data.data.services,

  // [ADMIN] Story 16.7: Thùng rác & Kho tồn
  listTrash: async (page = 1): Promise<{ items: TrashItem[]; total: number }> => {
    const res = await apiClient.get('/admin/trash', { params: { page } });
    return { items: res.data.data, total: res.data.meta.total };
  },
  restoreApartment: async (id: string) => apiClient.post(`/admin/trash/${id}/restore`),
  purgeApartment: async (id: string) => apiClient.delete(`/admin/trash/${id}`),
  listStale: async (params: StaleQuery & { page?: number }): Promise<{ items: StaleItem[]; total: number }> => {
    const res = await apiClient.get('/admin/stale', { params });
    return { items: res.data.data, total: res.data.meta.total };
  },
  bulkStale: async (input: BulkStaleInput): Promise<{ done: number; total: number }> => (await apiClient.post('/admin/stale/bulk', input)).data.data,

  // [ADMIN] Story 16.5: cảnh báo bảo mật
  listAlerts: async (params: { status: 'open' | 'resolved'; page?: number }): Promise<{ items: SecurityAlert[]; total: number }> => {
    const res = await apiClient.get('/admin/alerts', { params });
    return { items: res.data.data, total: res.data.meta.total };
  },
  countOpenAlerts: async (): Promise<number> => (await apiClient.get('/admin/alerts/count')).data.data.count,
  resolveAlert: async (id: string): Promise<SecurityAlert> => (await apiClient.patch(`/admin/alerts/${id}/resolve`)).data.data,

  // [ADMIN] action / category / severity: 1 hoặc nhiều giá trị, cách nhau dấu phẩy
  listAuditLogs: async (params: AuditQuery & { page?: number }): Promise<{ items: AuditLogEntry[]; total: number }> => {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return { items: res.data.data, total: res.data.meta.total };
  },
  // [ADMIN] Story 16.2: CSV theo bộ lọc hiện tại (server tạo, tối đa 10.000 dòng) → tải về máy
  exportAuditLogs: async (params: AuditQuery) => {
    const res = await apiClient.get('/admin/audit-logs/export', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhat-ky-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
