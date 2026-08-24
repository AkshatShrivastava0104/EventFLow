import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { EventStatusBadge } from './EventStatusBadge';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventItem } from '@/types/event';

interface Props {
  event: EventItem;
  to: string;
  className?: string;
}

export function EventCard({ event, to, className }: Props) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-lg border border-ink-200 bg-white p-5 shadow-soft transition',
        'hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-pop',
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <EventStatusBadge status={event.status} />
        {event.capacity != null && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-400">
            <Users className="h-3.5 w-3.5" />
            {event.capacity}
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 text-base font-semibold text-ink-900 group-hover:text-accent-700">
        {event.title}
      </h3>
      {event.description && (
        <p className="mt-1 line-clamp-2 text-sm text-ink-500">
          {event.description}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-ink-100 pt-3 text-sm text-ink-600">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
          {fmtDateTime(event.start_time)}
        </span>
        {event.venue && (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="truncate">{event.venue}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
