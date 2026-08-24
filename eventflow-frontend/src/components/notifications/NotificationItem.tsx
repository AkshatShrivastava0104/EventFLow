import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Ticket,
  Users,
  LucideIcon,
} from 'lucide-react';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/notification';

const TYPE_ICON: Record<string, LucideIcon> = {
  registration: Ticket,
  ticket: Ticket,
  event: CalendarClock,
  reminder: CalendarClock,
  waitlist: Users,
  checkin: CheckCircle2,
  check_in: CheckCircle2,
};

interface Props {
  notification: Notification;
  onMarkRead?: (id: number) => void;
  marking?: boolean;
}

export function NotificationItem({ notification, onMarkRead, marking }: Props) {
  const Icon = TYPE_ICON[notification.type?.toLowerCase()] ?? Bell;
  const unread = notification.status === 'unread';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 transition',
        unread ? 'border-accent-200 bg-accent-50/50' : 'border-ink-200 bg-white',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full',
          unread ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-500',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', unread ? 'font-medium text-ink-900' : 'text-ink-700')}>
          {notification.message}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">{fmtRelative(notification.created_at)}</p>
      </div>

      {unread && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="mt-1 h-2 w-2 rounded-full bg-accent-500" aria-label="Unread" />
          {onMarkRead && (
            <button
              onClick={() => onMarkRead(notification.id)}
              disabled={marking}
              className="text-xs font-medium text-accent-700 hover:text-accent-800 disabled:opacity-50"
            >
              Mark read
            </button>
          )}
        </div>
      )}
    </div>
  );
}
