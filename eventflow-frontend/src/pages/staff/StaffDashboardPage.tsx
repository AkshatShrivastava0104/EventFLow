import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Users, ScanLine, Ticket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { eventsApi } from '@/api/event';
import { EventCard } from '@/components/events/EventCard';

export function StaffDashboardPage() {
  const events = useQuery({
    queryKey: ['events', 'staff'],
    queryFn: () => eventsApi.list({ page_size: 50, status: 'published' }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Operations</h1>
        <p className="mt-1 text-sm text-ink-500">Manage registrations, tickets and on-site check-in.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-100 text-ink-700"><CalendarDays className="h-4 w-4" /></div>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">Live events</p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
            {events.data?.data?.length ?? '—'}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-100 text-ink-700"><Users className="h-4 w-4" /></div>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">Registrations</p>
          </div>
          <Link to="/staff/registrations" className="mt-3 inline-block text-sm font-medium text-ink-900 hover:underline">Open →</Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-100 text-ink-700"><Ticket className="h-4 w-4" /></div>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">Tickets</p>
          </div>
          <Link to="/owner/tickets" className="mt-3 inline-block text-sm font-medium text-ink-900 hover:underline">Open →</Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-100 text-ink-700"><ScanLine className="h-4 w-4" /></div>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">Check-in</p>
          </div>
          <Link to="/staff/check-in" className="mt-3 inline-block text-sm font-medium text-ink-900 hover:underline">Open →</Link>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today & upcoming</CardTitle>
            <CardDescription>Published events available for operations.</CardDescription>
          </div>
          <Link to="/staff/registrations"><Button variant="outline" size="sm">All registrations</Button></Link>
        </CardHeader>

        {events.isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : (events.data?.data?.length ?? 0) === 0 ? (
          <EmptyState title="No published events" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {events.data!.data.map(e => (
              <EventCard key={e.id} event={e} to={`/staff/events/${e.id}`} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
