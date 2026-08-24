import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { eventsApi } from '@/api/event';
import type { ListQuery } from '@/types/common';

export function EventsPage() {
    const [query, setQuery] = useState<ListQuery>({ page: 1, page_size: 12, order: 'desc' });
    const { data, isLoading } = useQuery({
        queryKey: ['events', 'list', query],
        queryFn: () => eventsApi.list({
            page: query.page,
            page_size: query.page_size,
            search: query.search,
            status: query.status,
            order: query.order,
            sort: query.sort,
        }),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Events</h1>
                    <p className="mt-1 text-sm text-ink-500">Create, publish and manage events.</p>
                </div>
                <Link to="/owner/events/new"><Button>+ New event</Button></Link>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>All events</CardTitle>
                        <CardDescription>Drafts, published, cancelled and completed.</CardDescription>
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
                        title="No events found"
                        description="Adjust filters or create a new event."
                        action={<Link to="/owner/events/new"><Button>Create event</Button></Link>}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {data!.data.map(e => <EventCard key={e.id} event={e} to={`/owner/events/${e.id}`} />)}
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
