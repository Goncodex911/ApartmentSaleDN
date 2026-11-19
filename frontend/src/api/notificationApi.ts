import { apiClient } from './client.js';

export interface AppNotification {
  _id: string;
  type: 'NEW_CHAT_LEAD' | 'APARTMENT_MATCH' | 'LISTING_SUBMITTED' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'LEASE_EXPIRING' | 'LISTING_FLAGGED' | 'SOURCE_AVAILABLE_AGAIN' | 'LEAD_DEPOSITED';
  title: string;
  body: string;
  leadId?: string;
  apartmentId?: string;
  readAt?: string;
  createdAt: string;
}

// Thông báo trong app (Story 6.2, 6.3)
export const notificationApi = {
  list: async (): Promise<{ items: AppNotification[]; unreadCount: number }> => {
    const res = await apiClient.get('/notifications');
    return res.data.data;
  },
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};
