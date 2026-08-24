import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { eventsApi } from '@/api/event';
import type { ListQuery } from '@/types/common';

export function BrowseEventsPage() {
  const [query, setQuery] = useState<ListQuery>({
    page: 1, page_size: 12, status: 'published', order: 'asc',
  });
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'public', query],
    queryFn: () => eventsApi.list({
      page: query.page,
      page_size: query.page_size,
      search: query.search,
      status: 'published',
      order: query.order,
      sort: query.sort,
    }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Discover events</h1>
        <p className="mt-1 text-sm text-ink-500">Find upcoming events and reserve your seat.</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Only published events are shown.</CardDescription>
          </div>
        </CardHeader>

        <div className="mb-4">
          <EventFilters value={query} onChange={setQuery} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No events available"
            description="Check back soon for new events."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data!.data.map(e => <EventCard key={e.id} event={e} to={`/app/events/${e.id}`} />)}
          </div>
        )}

        <div className="mt-4">
          <Pagination
            page={data?.meta.page ?? 1}
            totalPages={data?.meta.total_pages ?? 1}
            onChange={p => setQuery(q => ({ ...q, page: p }))}
          />
        </div>
      </Card>
    </div>
  );
}
