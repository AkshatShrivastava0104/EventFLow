import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnreadCount, useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { fmtRelative } from '@/lib/format';
import { NOTIFICATION_TYPE } from '@/lib/constants';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: count } = useUnreadCount();
  const { data } = useNotifications(1, 5);
  const unread = count?.count ?? 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-ink-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            <Link
              to="/owner/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-ink-500 hover:text-ink-900"
            >
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data?.data?.length ? (
              data.data.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex flex-col gap-0.5 border-b border-ink-100 px-4 py-3 last:border-b-0',
                    !n.read_at && 'bg-accent-50/40',
                  )}
                >
                  <p className="text-sm font-medium text-ink-900">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-ink-600">{n.message}</p>
                  <p className="text-2xs text-ink-400">{fmtRelative(n.created_at)} · {NOTIFICATION_TYPE[n.type] ?? n.type}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-500">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
