import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronRight, QrCode } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { useOrg } from '@/contexts/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { fmtDateTime } from '@/lib/format';
import { normalizeError } from '@/api/client';

export function CheckInHub() {
  const { activeOrgId } = useOrg();

  const { data, isLoading, error } = useQuery({
    queryKey: ['org', activeOrgId, 'events', 'all'],
    queryFn: () => eventsApi.listByOrg(activeOrgId!, { page: 1, limit: 100 }),
    enabled: activeOrgId != null,
  });

  const checkInable = useMemo(
    () =>
      (data?.events ?? [])
        .filter((e) => e.status === 'published' || e.status === 'completed')
        .sort((a, b) => {
          const at = a.start_time ? new Date(a.start_time).getTime() : 0;
          const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
          return bt - at;
        }),
    [data],
  );

  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Pick an event to start admitting attendees."
      />

      {error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : checkInable.length === 0 ? (
        <EmptyState
          icon={<QrCode className="h-5 w-5" />}
          title="No events to check in"
          description="Only published or completed events can accept check-ins."
        />
      ) : (
        <div className="grid gap-3">
          {checkInable.map((e) => (
            <Link key={e.id} to={`/org/events/${e.id}/check-in`}>
              <Card className="flex items-center gap-4 transition hover:border-ink-300 hover:shadow-pop">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                  <QrCode className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-ink-900">{e.title}</p>
                    <EventStatusBadge status={e.status} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fmtDateTime(e.start_time)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
