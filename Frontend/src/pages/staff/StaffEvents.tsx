import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  EventsAPI,
  OrgsAPI,
} from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { fmtDate } from '../../lib/utils';
import {
  Calendar,
  MapPin,
  ScanLine,
} from 'lucide-react';

export function StaffEvents() {
  const {
    data: organizations = [],
    isLoading: organizationsLoading,
  } = useQuery({
    queryKey: ['organizations', 'staff-events'],
    queryFn: () => OrgsAPI.list(),
  });

  const organization = organizations[0];

  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: [
      'events',
      'staff-all',
      organization?.id,
    ],
    queryFn: () =>
      EventsAPI.listByOrganization(
        organization!.id,
        {
          page: 1,
          limit: 100,
        }
      ),
    enabled: !!organization?.id,
  });

  const isLoading =
    organizationsLoading || eventsLoading;

  return (
    <div className="space-y-4">
      {/* Header */}

      <div>
        <h2 className="font-display text-2xl font-semibold">
          Events
        </h2>

        <p className="text-sm text-ink-500">
          Published events available for your organization.
        </p>
      </div>

      {/* Events */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                className="h-64"
              />
            )
          )}

        {!isLoading &&
          events.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={
                  <Calendar className="h-5 w-5" />
                }
                title="No events"
                description="Published organization events will appear here."
              />
            </div>
          )}

        {!isLoading &&
          events.map((event) => {
            const registered =
              Number(event.registered_count) || 0;

            const capacity =
              Number(event.capacity) || 0;

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-sm"
              >
                {/* Event image */}

                <div className="h-24 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500" />

                {/* Meta */}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge tone="green" dot>
                    {registered}
                    {capacity > 0
                      ? `/${capacity}`
                      : ''}{' '}
                    registered
                  </Badge>

                  {event.category && (
                    <span className="truncate text-xs text-ink-500">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Title */}

                <p className="mt-1 line-clamp-1 font-display text-lg font-semibold">
                  {event.title}
                </p>

                {/* Event information */}

                <div className="mt-2 space-y-1 text-xs text-ink-500">
                  {event.start_at && (
                    <p className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />

                      {fmtDate(
                        event.start_at,
                        'MMM d, p'
                      )}
                    </p>
                  )}

                  {(event.venue || event.city) && (
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />

                      {[event.venue, event.city]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>

                {/* Check-in */}

                <Link
                  to={`/staff/scanner?event_id=${event.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <ScanLine className="h-4 w-4" />

                  Start check-in
                </Link>
              </div>
            );
          })}
      </div>
    </div>
  );
}