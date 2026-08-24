import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/api/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { normalizeError } from '@/api/client';

export function Notifications() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useNotifications(page, DEFAULT_PAGE_SIZE);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(res.updated > 0 ? `${res.updated} marked as read` : 'All caught up');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some((n) => n.status === 'unread');

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your events and registrations."
        actions={
          <Button
            variant="outline"
            icon={<CheckCheck className="h-4 w-4" />}
            loading={markAll.isPending}
            disabled={!hasUnread}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        }
      />

      {error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="No notifications"
          description="You're all caught up — new updates will appear here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markRead.mutate(id)}
                marking={markRead.isPending && markRead.variables === n.id}
              />
            ))}
          </div>
          {data && (
            <Pagination
              className="mt-4"
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
