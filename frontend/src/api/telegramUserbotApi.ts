import { apiClient } from './client.js';

export interface TelegramDialog {
  id: string;
  title: string;
  isChannel: boolean;
  isGroup: boolean;
  username: string | null;
}

export interface TelegramSessionStatus {
  success: boolean;
  isConnected: boolean;
  user?: {
    phone: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    connectedAt?: string;
  };
}

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

  startQrAuth: async (): Promise<{ success: boolean; tgUrl: string; expiresAt: number }> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/qr/start');
    return res.data;
  },

  checkQrAuth: async (password?: string): Promise<{ status: 'WAITING' | 'SUCCESS' | 'REQUIRES_2FA' | 'EXPIRED'; user?: any; message?: string }> => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/qr/check', { password });
    return res.data;
  },

  sendCode: async (phone: string) => {
    const res = await apiClient.post('/ingestion/telegram-userbot/auth/send-code', { phone });
    return res.data;
  },

  verifyCode: async (payload: { phone: string; phoneCodeHash: string; code: string; password?: string }) => {
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
