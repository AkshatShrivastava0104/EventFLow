import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    StatsAPI,
    EventsAPI,
    OrgsAPI,
    StaffAPI,
} from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';
import {
    CalendarDays,
    Ticket,
    Users,
    UserCog,
    BarChart3,
    ArrowRight,
    Building2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fmtDate } from '../../lib/utils';
import { resolveMediaUrl } from '../../lib/api';

export function AdminOverview() {
    const {
        data: statsResponse,
        isLoading: statsLoading,
    } = useQuery({
        queryKey: ['stats', 'organization'],
        queryFn: async () => {
            const organizations = await OrgsAPI.list();

            const organization = organizations[0];

            if (!organization?.id) {
                return null;
            }

            return StatsAPI.organization(organization.id);
        },
    });

    const {
        data: organizations = [],
        isLoading: organizationsLoading,
    } = useQuery({
        queryKey: ['organizations', 'admin'],
        queryFn: () => OrgsAPI.list(),
    });

    const organization = organizations[0];

    const {
        data: events = [],
        isLoading: eventsLoading,
    } = useQuery({
        queryKey: [
            'events',
            'admin',
            organization?.id,
        ],
        queryFn: () =>
            EventsAPI.listByOrganization(
                organization!.id,
                {
                    page: 1,
                    limit: 5,
                }
            ),
        enabled: !!organization?.id,
    });

    const {
        data: members = [],
        isLoading: membersLoading,
    } = useQuery({
        queryKey: [
            'organization',
            organization?.id,
            'members',
        ],
        queryFn: () =>
            StaffAPI.list(organization!.id),
        enabled: !!organization?.id,
    });

    const stats =
        statsResponse?.stats ??
        statsResponse;

    const today = new Date();

    const eventsToday = events.filter(
        (event) =>
            event.start_at &&
            new Date(event.start_at).toDateString() ===
            today.toDateString()
    ).length;

    const totalTickets =
        stats?.tickets ?? 0;

    const totalAttendees =
        stats?.check_ins ?? 0;

    const attendanceRate =
        stats?.attendance_rate ??
        (
            totalTickets > 0
                ? (totalAttendees / totalTickets) * 100
                : 0
        );

    const adminCount = members.filter(
        (member) =>
            member.role?.toUpperCase() === 'ADMIN'
    ).length;

    const staffCount = members.filter(
        (member) =>
            member.role?.toUpperCase() === 'STAFF'
    ).length;

    const loading =
        statsLoading ||
        organizationsLoading ||
        eventsLoading ||
        membersLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl font-semibold">
                        Organization dashboard
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Manage your organization, events, members,
                        and registrations.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link to="/admin/events">
                        <Button
                            variant="secondary"
                            leftIcon={
                                <CalendarDays className="h-4 w-4" />
                            }
                        >
                            Manage events
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Organization */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                            <Building2 className="h-6 w-6 text-brand-600" />
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Your organization
                            </p>

                            <h3 className="font-display text-lg font-semibold">
                                {organization?.name ||
                                    (organizationsLoading
                                        ? 'Loading...'
                                        : 'Organization')}
                            </h3>

                            {organization?.description && (
                                <p className="mt-1 max-w-2xl text-sm text-ink-500">
                                    {organization.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <Link to="/admin/organization">
                        <Button variant="secondary">
                            Organization settings
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Events today"
                    value={loading ? '—' : eventsToday}
                    icon={
                        <CalendarDays className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Total tickets"
                    value={loading ? '—' : totalTickets}
                    icon={
                        <Ticket className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Attendees checked in"
                    value={loading ? '—' : totalAttendees}
                    icon={
                        <Users className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Attendance rate"
                    value={
                        loading
                            ? '—'
                            : `${Number(attendanceRate).toFixed(1)}%`
                    }
                    icon={
                        <BarChart3 className="h-5 w-5" />
                    }
                />
            </div>

            {/* Organization members */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Organization members
                            </p>

                            <p className="mt-1 font-display text-2xl font-semibold">
                                {loading
                                    ? '—'
                                    : members.length}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                            <Users className="h-5 w-5 text-brand-600" />
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Badge tone="blue">
                            {adminCount} admin
                            {adminCount !== 1 ? 's' : ''}
                        </Badge>

                        <Badge tone="green">
                            {staffCount} staff
                        </Badge>
                    </div>

                    <Link
                        to="/admin/members"
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                    >
                        Manage members
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Total registrations
                            </p>

                            <p className="mt-1 font-display text-2xl font-semibold">
                                {loading
                                    ? '—'
                                    : stats?.registrations ?? 0}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                            <UserCog className="h-5 w-5 text-brand-600" />
                        </div>
                    </div>

                    <Link
                        to="/admin/registrations"
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                    >
                        View registrations
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>

            {/* Event statistics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Total events
                    </p>

                    <p className="mt-1 font-display text-2xl font-semibold">
                        {loading ? '—' : stats?.events ?? 0}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Published
                    </p>

                    <p className="mt-1 font-display text-2xl font-semibold">
                        {loading
                            ? '—'
                            : stats?.published_events ?? 0}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Upcoming
                    </p>

                    <p className="mt-1 font-display text-2xl font-semibold">
                        {loading
                            ? '—'
                            : stats?.upcoming_events ?? 0}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        This month
                    </p>

                    <p className="mt-1 font-display text-2xl font-semibold">
                        {loading
                            ? '—'
                            : stats?.events_this_month ?? 0}
                    </p>
                </div>
            </div>

            {/* Upcoming events */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-lg font-semibold">
                            Upcoming events
                        </h3>

                        <p className="mt-1 text-xs text-ink-500">
                            Recently published events in your organization.
                        </p>
                    </div>

                    <Link
                        to="/admin/events"
                        className="text-xs font-semibold text-brand-600"
                    >
                        All events →
                    </Link>
                </div>

                <div className="mt-3 divide-y divide-ink-100">
                    {events.length === 0 && !eventsLoading ? (
                        <div className="py-8 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-ink-300" />

                            <p className="mt-2 text-sm font-medium text-ink-600">
                                No upcoming events
                            </p>

                            <p className="mt-1 text-xs text-ink-400">
                                Create your first event to get started.
                            </p>

                            <Link
                                to="/admin/events/new"
                                className="mt-3 inline-flex text-xs font-semibold text-brand-600"
                            >
                                Create event →
                            </Link>
                        </div>
                    ) : (
                        events.map((event) => (
                            <div
                                key={event.id}
                                className="flex flex-wrap items-center gap-4 py-3"
                            >
                                {(() => {
                                    const coverImage =
                                        event.cover_image ||
                                        '';

                                    return coverImage ? (
                                        <img
                                            src={resolveMediaUrl(coverImage)}
                                            alt={event.title || 'Event cover'}
                                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500" />
                                    );
                                })()}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                        {event.title}
                                    </p>

                                    <p className="text-xs text-ink-500">
                                        {fmtDate(event.start_at)}
                                        {event.venue
                                            ? ` • ${event.venue}`
                                            : ''}
                                        {event.city
                                            ? `, ${event.city}`
                                            : ''}
                                    </p>
                                </div>

                                <Badge tone="green" dot>
                                    {event.registered_count ?? 0}{' '}
                                    registered
                                </Badge>

                                <Link
                                    to={`/admin/events/${event.id}/edit`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                                >
                                    Manage
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}