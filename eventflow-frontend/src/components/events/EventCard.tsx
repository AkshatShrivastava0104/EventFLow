import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EventStatusBadge } from './EventStatusBadge';
import { fmtDateTime } from '@/lib/format';
import type { Event } from '@/types/event';

export function EventCard({ event, to }: { event: Event; to: string }) {
  return (
    <Link to={to} className="group block">
      <Card className="transition-shadow hover:shadow-pop">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-semibold text-ink-900 group-hover:text-accent-700">
            {event.title}
          </h3>
          <EventStatusBadge status={event.status} />
        </div>
        {event.description && (
          <p className="mb-4 line-clamp-2 text-sm text-ink-500">{event.description}</p>
        )}
        <div className="space-y-1.5 text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ink-400" />
            <span>{fmtDateTime(event.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ink-400" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ink-400" />
            <span>
              {event.available_seats} / {event.capacity} seats available
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
