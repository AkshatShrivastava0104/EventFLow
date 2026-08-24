import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CalendarSearch } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { EventCard } from '@/components/events/EventCard';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { normalizeError } from '@/api/client';

export function Browse() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['events', 'browse', page],
    queryFn: () =>
      eventsApi.browse({ page, page_size: DEFAULT_PAGE_SIZE, status: 'published', order: 'asc' }),
    placeholderData: keepPreviousData,
  });

  const events = data?.events ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.venue ?? '').toLowerCase().includes(q),
    );
  }, [events, query]);

  return (
    <div>
      <PageHeader
        title="Discover events"
        description="Browse published events and reserve your spot."
        actions={
          <div className="w-full sm:w-72">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search on this page…"
            />
          </div>
        }
      />

      {error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarSearch className="h-5 w-5" />}
          title={query ? 'No matching events' : 'No events yet'}
          description={
            query
              ? 'Try a different search term.'
              : 'Check back soon — new events are published regularly.'
          }
        />
      ) : (
        <div
          className={
            isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} to={`/app/events/${event.id}`} />
            ))}
          </div>
          {data && (
            <Pagination
              className="mt-6"
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
