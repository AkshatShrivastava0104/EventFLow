import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['notifications', { page, limit }],
    queryFn: () => notificationsApi.list({ page, limit }),
    staleTime: 15_000,
  });
}
