import { apiClient } from './client.js';

export const ingestionApi = {
  // Nhập nhanh đoạn tin nhắn từ Portal
  quickPaste: async (data: { rawText: string; mediaUrls?: string[]; sourceName?: string }) => {
    const res = await apiClient.post('/ingestion/quick-paste', data);
    return res.data;
  },

  // Bóc tách AI thử nghiệm
  parseText: async (rawText: string) => {
    const res = await apiClient.post('/ingestion/parse', { rawText });
    return res.data;
  },
};
