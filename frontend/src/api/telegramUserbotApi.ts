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

  scrape: async (payload: { chat: string; targetSender: string; limit: number }) => {
    const res = await apiClient.post('/ingestion/telegram-userbot/scrape', payload);
    return res.data;
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
