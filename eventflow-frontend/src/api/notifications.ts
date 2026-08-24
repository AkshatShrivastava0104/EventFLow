import { get, patch } from './client';
import type { Notification } from '@/types/notification';
import type { ListQuery, Paginated } from '@/types/common';

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface BackendPaginatedNotifications {
  notifications: Notification[];
  pagination: BackendPagination;
}

interface UnreadCountResponse {
  unread_count: number;
}

function normalizePaginatedNotifications(
  response: BackendPaginatedNotifications,
): Paginated<Notification> {
  return {
    data: response.notifications ?? [],
    meta: {
      page: response.pagination?.page ?? 1,
      page_size: response.pagination?.limit ?? 20,
      total: response.pagination?.total ?? 0,
      total_pages: response.pagination?.total_pages ?? 0,
    },
  };
}

export const notificationsApi = {
  list: async (
    q: ListQuery = {},
  ): Promise<Paginated<Notification>> => {
    const response =
      await get<BackendPaginatedNotifications>(
        '/notifications',
        q as Record<string, unknown>,
      );

    return normalizePaginatedNotifications(response);
  },

  unreadCount: async (): Promise<{
    count: number;
  }> => {
    const response =
      await get<UnreadCountResponse>(
        '/notifications/unread-count',
      );

    return {
      count: response.unread_count ?? 0,
    };
  },

  markRead: (id: string) =>
    patch<Notification>(
      `/notifications/${id}/read`,
    ),

  markAllRead: () =>
    patch<{ updated: number }>(
      '/notifications/read-all',
    ),
};