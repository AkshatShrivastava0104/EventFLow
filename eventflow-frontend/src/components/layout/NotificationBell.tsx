import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface Props {
  tone?: 'light' | 'dark';
  to?: string;
}

export function NotificationBell({ tone = 'dark', to = '/app/notifications' }: Props) {
  const { data } = useUnreadCount();
  const count = data?.unread_count ?? 0;
  const light = tone === 'light';

  return (
    <Link
      to={to}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-full transition',
        light ? 'text-white/90 hover:bg-white/10' : 'text-ink-600 hover:bg-ink-100',
      )}
      aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-2xs font-semibold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
