import { apiClient } from './client.js';

export interface TelegramDialog {
  id: string;
  title: string;
  isChannel: boolean;
  isGroup: boolean;
  username: string | null;
}

/** Kênh Telegram đã gửi mã đăng nhập (Story 18.1) */
export type CodeChannel = 'APP' | 'SMS' | 'EMAIL' | 'CALL' | 'MISSED_CALL' | 'FRAGMENT' | 'SETUP_EMAIL' | 'FIREBASE' | 'OTHER';
export interface CodeDelivery {
  channel: CodeChannel;
  length?: number;
  emailPattern?: string;
  fragmentUrl?: string;
  missedCallPrefix?: string;
  nextChannel?: CodeChannel;
  timeoutSec?: number;
}
export interface PendingCode {
  phoneMasked: string;
  delivery: CodeDelivery;
  expiresAt: string;
}

export interface TelegramSessionStatus {
  success: boolean;
  isConnected: boolean;
  message?: string; // Phiên vừa bị Telegram thu hồi (Story 18.5)
  lastCheckedAt?: string | null;
  pendingLogin?: PendingCode | null; // Đang dở bước nhập mã (Story 18.2)
  user?: {
    phone: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    connectedAt?: string;
  };
}

export type QrCheck = { status: 'WAITING' | 'SUCCESS' | 'REQUIRES_2FA' | 'EXPIRED'; tgUrl?: string; expiresAt?: number; message?: string };

export interface ScrapeLog {
  at: number;
  level: 'info' | 'success' | 'warn' | 'error';
  text: string;
}

export interface ScrapeTask {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  percent: number;
  entries: ScrapeLog[];
  apartments: any[];
  error?: string;
  errorCode?: string;
  stopRequested: boolean;
}

export const telegramUserbotApi = {
  getStatus: async (): Promise<TelegramSessionStatus> => {
    const res = await apiClient.get('/ingestion/telegram-userbot/status');
    return res.data;
  },

  startQrAuth: async (): Promise<QrCheck> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/qr/start');
    return res.data;
  },

  checkQrAuth: async (password?: string): Promise<QrCheck> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/qr/check', { password });
    return res.data;
  },

  sendCode: async (phone: string): Promise<{ status: 'CODE_SENT' | 'SUCCESS' } & Partial<PendingCode>> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/send-code', { phone });
    return res.data;
  },

  resendCode: async (): Promise<PendingCode> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/resend-code');
    return res.data;
  },

  cancelCode: async () => {
    await apiClient.post('/ingestion/telegram-userbot/auth/cancel-code');
  },

  // Số điện thoại và mã băm nằm ở máy chủ → chỉ gửi mã (+ mật khẩu 2FA)
  verifyCode: async (payload: { code: string; password?: string }): Promise<{ success?: boolean; requires2FA?: boolean; message?: string }> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/verify', payload);
    return res.data;
  },

  disconnect: async () => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/disconnect');
    return res.data;
  },

  getDialogs: async (): Promise<TelegramDialog[]> => {
    const res = await apiClient.get('/ingestion/telegram-userbot/dialogs');
    return res.data.dialogs || [];
  },

  /** Khởi chạy cào tin dưới nền, trả về taskId để hỏi tiến trình */
  startScrape: async (payload: { chat: string; targetSender: string; limit: number }): Promise<string> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/scrape', payload);
    return res.data.taskId;
  },

  getScrapeTask: async (taskId: string): Promise<ScrapeTask> => {
    const res = await apiClient.get(`/ingestion/telegram-userbot/scrape/${encodeURIComponent(taskId)}`);
    return res.data.task;
  },

  /** Tác vụ đang chạy của tôi (mở lại trang vẫn theo dõi tiếp) */
  getActiveScrape: async (): Promise<ScrapeTask | null> => {
    const res = await apiClient.get('/ingestion/telegram-userbot/scrape/active');
    return res.data.task;
  },

  cancelScrape: async (taskId: string): Promise<ScrapeTask> => {
    const res = await apiClient.post(`/ingestion/telegram-userbot/scrape/${encodeURIComponent(taskId)}/cancel`);
    return res.data.task;
  },

  startListener: async (payload: { chat: string; targetSender: string }) => {
    const res = await apiClient.post('/ingestion/telegram-userbot/listener/start', payload);
    return res.data;
  },

  stopListener: async () => {
    const res = await apiClient.post('/ingestion/telegram-userbot/listener/stop');
    return res.data;
  },

  getListenerStatus: async () => {
    const res = await apiClient.get('/ingestion/telegram-userbot/listener/status');
    return res.data;
  },
};
