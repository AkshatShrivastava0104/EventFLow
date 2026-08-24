import { cn } from '@/lib/utils';
import { fmtRelative } from '@/lib/format';
import { NOTIFICATION_TYPE } from '@/lib/constants';
import type { Notification } from '@/types/notification';

export function NotificationItem({
  notification, onMarkRead,
}: {
  notification: Notification;
  onMarkRead?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-ink-100 px-4 py-3 last:border-b-0',
        !notification.read_at && 'bg-accent-50/40',
      )}
      onClick={() => !notification.read_at && onMarkRead?.(notification.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
        <span className="text-2xs text-ink-400">{fmtRelative(notification.created_at)}</span>
      </div>
      <p className="text-sm text-ink-600">{notification.message}</p>
      <p className="text-2xs text-ink-400">{NOTIFICATION_TYPE[notification.type] ?? notification.type}</p>
    </div>
  );
}
