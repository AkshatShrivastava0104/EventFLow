import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { EventItem } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { eventStatusLabel, fmtDate, fmtMoney } from '../../lib/utils';

const FALLBACK_GRADIENTS = [
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-orange-500 via-rose-500 to-pink-600',
  'from-violet-600 via-fuchsia-500 to-pink-500',
  'from-sky-500 via-indigo-500 to-purple-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-lime-500 via-emerald-500 to-teal-600',
];

export function EventCard({ event, compact }: { event: EventItem; compact?: boolean }) {
  const status = eventStatusLabel(event.status, event.start_at, event.end_at);
  const gradient = FALLBACK_GRADIENTS[event.id % FALLBACK_GRADIENTS.length];
  const soldOut = event.capacity > 0 && event.registered_count >= event.capacity;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${gradient}`}>
        {event.cover_image ? (
          <img src={event.cover_image} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-display text-3xl font-semibold text-white/90 mix-blend-overlay px-6 text-center">{event.title}</div>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge tone={status.tone as any} dot>{status.label}</Badge>
          {event.price > 0 ? (
            <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-ink-900">{fmtMoney(event.price, event.currency)}</span>
          ) : (
            <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">Free</span>
          )}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-900">Sold out</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{event.category}</p>
        <h3 className="font-display text-lg font-semibold text-ink-900 line-clamp-2 leading-tight">{event.title}</h3>
        {!compact && <p className="text-sm text-ink-500 line-clamp-2">{event.description}</p>}
        <div className="mt-auto grid gap-1.5 pt-2 text-xs text-ink-600">
          <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-ink-400" /> {fmtDate(event.start_at, 'MMM d, yyyy • p')}</div>
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-ink-400" /> {event.venue}, {event.city}</div>
          <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-ink-400" /> {event.registered_count} / {event.capacity} attending</div>
        </div>
      </div>
    </Link>
  );
}
