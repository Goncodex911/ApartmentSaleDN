import { apiClient } from './client.js';

export const ingestionApi = {
  // Nhập nhanh đoạn tin nhắn từ Portal
  quickPaste: async (data: { rawText: string; mediaUrls?: string[]; sourceName?: string }) => {
    const res = await apiClient.post('/ingestion/quick-paste', data);
    return res.data;
  },

  // Story 20.2: sửa quyết định gộp của AI
  split: async (masterId: string, subListingId: string) => (await apiClient.post('/ingestion/split', { masterId, subListingId })).data,
  keepSeparate: async (apartmentId: string) => (await apiClient.post('/ingestion/keep-separate', { apartmentId })).data,
  mergeInto: async (apartmentId: string, targetId: string) => (await apiClient.post('/ingestion/merge-into', { apartmentId, targetId })).data,

  // Bóc tách AI thử nghiệm
  parseText: async (rawText: string) => {
    const res = await apiClient.post('/ingestion/parse', { rawText });
    return res.data;
  },
};
