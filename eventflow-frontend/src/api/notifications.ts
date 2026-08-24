import { get, patch } from './client';
import type { PaginatedNotifications } from '@/types/notification';

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    get<PaginatedNotifications>('/notifications', params),

  unreadCount: () => get<{ unread_count: number }>('/notifications/unread-count'),

  markRead: (id: number) =>
    patch<{ message: string }>(`/notifications/${id}/read`),

  markAllRead: () =>
    patch<{ message: string; updated: number }>('/notifications/read-all'),
};
