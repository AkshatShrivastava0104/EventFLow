import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Building2, CalendarDays, CheckCircle2, Users, Ticket, ScanLine, ListOrdered,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { eventsApi } from '@/api/event';
import { registrationsApi } from '@/api/registrations';
import { ticketsApi } from '@/api/tickets';
import { organizationsApi } from '@/api/organizations';
import { EventCard } from '@/components/events/EventCard';
import { fmtNumber } from '@/lib/format';
import { differenceInDays, format } from 'date-fns';

function Metric({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
    return (
        <Card>
            <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-100 text-ink-700">
                    <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </Card>
    );
}

export function OwnerDashboardPage() {
    const events = useQuery({
        queryKey: ['events', 'all', { page_size: 100 }],
        queryFn: () => eventsApi.list({ page_size: 100 }),
    });

    const orgs = useQuery({
        queryKey: ['organizations', 'all', { page_size: 100 }],
        queryFn: () => organizationsApi.list({ page_size: 100 }),
    });

    const tickets = useQuery({
        queryKey: ['tickets', 'all', { page_size: 1 }],
        queryFn: () => ticketsApi.list({ page_size: 1 }),
    });

    // Registrations — we use /registrations/me as a fallback only if a global endpoint isn't exposed.
    // For owner analytics we use event-level aggregations when available.
    const recent = (events.data?.data ?? []).slice(0, 6);

    const totalEvents = events.data?.meta.total ?? 0;
    const activeEvents = (events.data?.data ?? []).filter(e => e.status === 'published').length;
    const totalOrgs = orgs.data?.meta.total ?? 0;
    const totalTickets = tickets.data?.meta.total ?? 0;

    // Build simple time-series analytics (registrations + events) by week from events list
    const series = (() => {
        const days = 14;
        const today = new Date();
        const buckets: Record<string, { label: string; events: number; registrations: number }> = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = format(d, 'MMM d');
            buckets[key] = { label: key, events: 0, registrations: 0 };
        }
        (events.data?.data ?? []).forEach(e => {
            const d = format(new Date(e.created_at), 'MMM d');
            if (buckets[d]) buckets[d].events += 1;
        });
        return Object.values(buckets);
    })();

    const top = (events.data?.data ?? [])
        .filter(e => e.status === 'published')
        .sort((a, b) => (b.capacity - b.available_seats) - (a.capacity - a.available_seats))
        .slice(0, 5)
        .map(e => ({
            label: e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title,
            registrations: e.capacity - e.available_seats,
        }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-ink-500">Overview of your organizations, events and registrations.</p>
                </div>
                <Link to="/owner/events/new" className="text-sm font-medium text-ink-900 underline-offset-4 hover:underline">
                    + New event
                </Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric icon={Building2} label="Organizations" value={fmtNumber(totalOrgs)} />
                <Metric icon={CalendarDays} label="Total events" value={fmtNumber(totalEvents)} />
                <Metric icon={CheckCircle2} label="Active events" value={fmtNumber(activeEvents)} />
                <Metric icon={Ticket} label="Tickets" value={fmtNumber(totalTickets)} />
                <Metric icon={Users} label="Registrations" value="—" hint="Across selected event" />
                <Metric icon={ListOrdered} label="Waitlisted" value="—" />
                <Metric icon={ScanLine} label="Check-ins" value="—" />
                <Metric icon={CalendarDays} label="Upcoming 7d" value={
                    (events.data?.data ?? []).filter(e =>
                        e.status === 'published' &&
                        differenceInDays(new Date(e.starts_at), new Date()) >= 0 &&
                        differenceInDays(new Date(e.starts_at), new Date()) <= 7,
                    ).length
                } />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <LineChartCard
                        title="Events created (last 14 days)"
                        description="Daily creation activity"
                        data={series}
                        dataKey="events"
                        xKey="label"
                    />
                </div>
                <BarChartCard
                    title="Top events"
                    description="By registrations"
                    data={top.length ? top : [{ label: '—', registrations: 0 }]}
                    dataKey="registrations"
                    xKey="label"
                />
            </div>

            {/* Recent events */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Recent events</CardTitle>
                        <CardDescription>Latest events across your organizations</CardDescription>
                    </div>
                    <Link to="/owner/events" className="text-sm font-medium text-ink-900 hover:underline">View all</Link>
                </CardHeader>

                {events.isLoading ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
                    </div>
                ) : recent.length ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {recent.map(e => <EventCard key={e.id} event={e} to={`/owner/events/${e.id}`} />)}
                    </div>
                ) : (
                    <p className="text-sm text-ink-500">No events yet.</p>
                )}
            </Card>
        </div>
    );
}
