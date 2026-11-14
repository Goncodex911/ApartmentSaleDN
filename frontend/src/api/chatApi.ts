import { apiClient } from './client.js';

export interface ChatSuggestion {
  apartmentId: string;
  title: string;
  price: number;
  district: string;
  image?: string;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: ChatSuggestion[];
}

// Khung chat AI trên trang xem phòng công khai (Story 6.2) — không cần đăng nhập
export const chatApi = {
  send: async (code: string, message: string, sessionId?: string) => {
    const res = await apiClient.post(`/chat/${code}/messages`, { message, sessionId });
    return res.data.data as { sessionId: string; reply: string; suggestions: ChatSuggestion[] };
  },
  history: async (code: string, sessionId: string) => {
    const res = await apiClient.get(`/chat/${code}/sessions/${sessionId}`);
    return res.data.data as { sessionId: string; messages: ChatMessage[] };
  },
};
