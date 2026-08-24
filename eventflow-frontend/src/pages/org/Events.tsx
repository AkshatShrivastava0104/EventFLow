import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { useOrg } from '@/contexts/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EVENT_STATUS_FILTERS } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { normalizeError } from '@/api/client';

const PAGE_SIZE = 12;

export function OrgEvents() {
  const { activeOrgId } = useOrg();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['org', activeOrgId, 'events', 'all'],
    queryFn: () => eventsApi.listByOrg(activeOrgId!, { page: 1, limit: 100 }),
    enabled: activeOrgId != null,
  });

  const all = data?.events ?? [];
  const filtered = useMemo(
    () => (status ? all.filter((e) => e.status === status) : all),
    [all, status],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const capped = data?.pagination.total != null && data.pagination.total > all.length;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Create, publish and manage your organization's events."
        actions={
          <Link to="/org/events/new">
            <Button icon={<Plus className="h-4 w-4" />}>New event</Button>
          </Link>
        }
      />

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EVENT_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition',
              status === f.value
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title={status ? 'No events with this status' : 'No events yet'}
          description={status ? 'Try a different filter.' : 'Create your first event to get started.'}
          action={
            !status ? (
              <Link to="/org/events/new">
                <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                  Create event
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Status</TH>
                <TH>Starts</TH>
                <TH className="text-right">Capacity</TH>
              </TR>
            </THead>
            <TBody>
              {pageItems.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <Link to={`/org/events/${e.id}`} className="font-medium text-ink-900 hover:text-accent-700">
                      {e.title}
                    </Link>
                    {e.venue && <p className="truncate text-xs text-ink-500">{e.venue}</p>}
                  </TD>
                  <TD>
                    <EventStatusBadge status={e.status} />
                  </TD>
                  <TD className="whitespace-nowrap text-ink-600">{fmtDateTime(e.start_time)}</TD>
                  <TD className="text-right tabular-nums text-ink-600">
                    {e.capacity ?? '∞'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination className="mt-4" page={page} totalPages={totalPages} onChange={setPage} />
          {capped && (
            <p className="mt-2 text-xs text-ink-400">
              Showing the most recent {all.length} events.
            </p>
          )}
        </>
      )}
    </div>
  );
}
