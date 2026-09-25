import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { NotificationsAPI } from '../../lib/queries';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { fmtRelative } from '../../lib/utils';
import { Link } from 'react-router-dom';

type NotificationItem = {
  id: number;
  user_id?: number;
  type: string;
  message: string;
  status?: 'unread' | 'read' | string;
  created_at: string;
  title?: string;
  link?: string;
  read?: boolean;
};

function normalizeNotifications(value: unknown): NotificationItem[] {
  if (Array.isArray(value)) {
    return value as NotificationItem[];
  }

  if (value && typeof value === 'object') {
    const response = value as {
      data?: unknown;
      notifications?: unknown;
    };

    if (Array.isArray(response.data)) {
      return response.data as NotificationItem[];
    }

    if (Array.isArray(response.notifications)) {
      return response.notifications as NotificationItem[];
    }
  }

  return [];
}

function isNotificationUnread(notification: NotificationItem) {
  if (typeof notification.status === 'string') {
    return notification.status === 'unread';
  }

  return notification.read === false;
}

function getNotificationTitle(notification: NotificationItem) {
  if (notification.title) {
    return notification.title;
  }

  switch (notification.type) {
    case 'success':
      return 'Success';

    case 'warning':
      return 'Important update';

    case 'event':
      return 'Event update';

    case 'registration':
      return 'Registration update';

    case 'ticket':
      return 'Ticket update';

    case 'waitlist':
      return 'Waitlist update';

    case 'EVENT_CANCELLED':
      return 'Event cancelled';

    default:
      return 'Notification';
  }
}

export function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () =>
      NotificationsAPI.list({
        user_id: user!.id,
      }),
    enabled: !!user,
  });

  const notifications = normalizeNotifications(data);

  const markRead = useMutation({
    mutationFn: (id: number) =>
      NotificationsAPI.markRead(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['notifications'],
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      NotificationsAPI.markAllRead(),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['notifications'],
      });

      qc.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      });
    },
  });

  const unread = notifications.filter(
    (notification) =>
      isNotificationUnread(notification)
  ).length;

  const iconFor = (type: string) =>
    type === 'success' ? (
      <CheckCircle2 className="h-4 w-4 text-brand-600" />
    ) : type === 'warning' ? (
      <AlertTriangle className="h-4 w-4 text-orange-600" />
    ) : type === 'event' ||
      type === 'EVENT_CANCELLED' ? (
      <Calendar className="h-4 w-4 text-sky-600" />
    ) : (
      <Info className="h-4 w-4 text-ink-500" />
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Inbox
          </p>

          <h1 className="font-display text-4xl font-semibold">
            Notifications
          </h1>
        </div>

        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            loading={markAll.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="mt-6 divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="You're all caught up"
            description="Notifications about your events and tickets will show up here."
          />
        ) : (
          notifications.map((notification) => {
            const unreadNotification =
              isNotificationUnread(notification);

            const inner = (
              <div
                className={`group flex gap-3 p-4 transition-colors ${unreadNotification
                    ? 'bg-brand-50/40'
                    : ''
                  }`}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50">
                  {iconFor(notification.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {getNotificationTitle(notification)}
                    </p>

                    <span className="text-[11px] text-ink-400">
                      {fmtRelative(
                        notification.created_at
                      )}
                    </span>
                  </div>

                  <p className="mt-0.5 text-sm text-ink-600">
                    {notification.message}
                  </p>

                  {unreadNotification && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markRead.mutate(
                          notification.id
                        );
                      }}
                      className="mt-1 text-xs font-semibold text-brand-600"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );

            return notification.link ? (
              <Link
                key={notification.id}
                to={notification.link}
                onClick={() => {
                  if (unreadNotification) {
                    markRead.mutate(
                      notification.id
                    );
                  }
                }}
              >
                {inner}
              </Link>
            ) : (
              <div key={notification.id}>
                {inner}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}