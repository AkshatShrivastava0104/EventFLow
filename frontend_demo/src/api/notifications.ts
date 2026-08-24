import api from '@/lib/axios';
import type { PaginatedNotifications } from '@/types';

export const notificationsApi = {
  list: async (page = 1, limit = 20): Promise<PaginatedNotifications> => {
    const res = await api.get<PaginatedNotifications>('/notifications', {
      params: { page, limit },
    });
    return res.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
};
