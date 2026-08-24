import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

export function useUnreadCount() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsApi.unreadCount(),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}

export function useNotifications(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: ['notifications', { page, pageSize }],
        queryFn: () => notificationsApi.list({ page, page_size: pageSize }),
        staleTime: 15_000,
    });
}
