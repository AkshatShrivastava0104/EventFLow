import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { UnreadDot } from '@/components/ui/Badge';
import { formatRelative, getErrorMessage } from '@/lib/utils';
import { Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'page', page],
    queryFn: () => notificationsApi.list(page, 20),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[24px] font-semibold text-ink">Notifications</h1>
        <div className="space-y-4 max-w-3xl">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'alert':
      case 'warning':
      case 'cancelled':
        return <AlertTriangle size={18} className="text-warning-deep mt-0.5" />;
      case 'success':
      case 'promoted':
        return <CheckCircle size={18} className="text-success mt-0.5" />;
      default:
        return <Info size={18} className="text-link mt-0.5" />;
    }
  };

  const getBgColor = (type: string, status: string) => {
    if (status === 'read') return 'bg-canvas';
    switch (type.toLowerCase()) {
      case 'alert':
      case 'warning':
      case 'cancelled':
        return 'bg-warning-soft/30';
      case 'success':
      case 'promoted':
        return 'bg-link-soft/30';
      default:
        return 'bg-elevated hover:bg-canvas';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <h1 className="text-[24px] font-semibold text-ink">Notifications</h1>

      {!data || data.notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="We'll let you know when there's an update."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {data.notifications.map((notif: Notification) => (
              <li 
                key={notif.id} 
                className={cn(
                  'p-4 transition-colors cursor-pointer',
                  getBgColor(notif.type, notif.status)
                )}
                onClick={() => {
                  if (notif.status === 'unread') {
                    markReadMutation.mutate(notif.id);
                  }
                }}
              >
                <div className="flex gap-4">
                  <div className="shrink-0 pt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-[14px] leading-5",
                      notif.status === 'unread' ? "font-medium text-ink" : "text-body"
                    )}>
                      {notif.message}
                    </p>
                    <p className="text-[12px] text-mute mt-1">
                      {formatRelative(notif.created_at)}
                    </p>
                  </div>
                  {notif.status === 'unread' && (
                    <div className="shrink-0 flex items-center">
                      <UnreadDot />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          <Pagination data={data.pagination} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
