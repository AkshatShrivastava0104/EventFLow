import { useMemo } from 'react';

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
    /*
     * ============================================================
     * ORGANIZATION
     * ============================================================
     */

    const {
        data: organizations = [],
        isLoading: organizationsLoading,
    } = useQuery({
        queryKey: ['organizations', 'admin'],
        queryFn: () => OrgsAPI.list(),
        staleTime: 60_000,
    });

    const organization = organizations[0];

    /*
     * ============================================================
     * ORGANIZATION STATS
     * ============================================================
     */

    const {
        data: statsResponse,
        isLoading: statsLoading,
    } = useQuery({
        queryKey: [
            'stats',
            'organization',
            organization?.id,
        ],
        queryFn: () =>
            StatsAPI.organization(
                organization!.id,
                '30d',
            ),
        enabled: !!organization?.id,
        staleTime: 60_000,
    });

    const stats =
        statsResponse?.stats ??
        statsResponse;

    /*
     * ============================================================
     * EVENTS
     * ============================================================
     */

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
                    limit: 10,
                },
            ),
        enabled: !!organization?.id,
        staleTime: 30_000,
    });

    /*
     * ============================================================
     * MEMBERS
     * ============================================================
     */

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
            StaffAPI.list(
                organization!.id,
            ),
        enabled: !!organization?.id,
        staleTime: 30_000,
    });

    /*
     * ============================================================
     * DERIVED DATA
     * ============================================================
     */

    const today = new Date();

    const eventsToday = useMemo(() => {
        return events.filter((event) => {
            if (!event.start_at) {
                return false;
            }

            return (
                new Date(
                    event.start_at,
                ).toDateString() ===
                today.toDateString()
            );
        }).length;
    }, [events]);

    const upcomingEvents = useMemo(() => {
        const now = Date.now();

        return events
            .filter((event) => {
                if (!event.start_at) {
                    return false;
                }

                return (
                    new Date(
                        event.start_at,
                    ).getTime() >= now
                );
            })
            .sort((a, b) => {
                return (
                    new Date(
                        a.start_at!,
                    ).getTime() -
                    new Date(
                        b.start_at!,
                    ).getTime()
                );
            });
    }, [events]);

    const totalTickets =
        stats?.tickets ?? 0;

    const totalAttendees =
        stats?.check_ins ?? 0;

    const attendanceRate =
        stats?.attendance_rate ??
        (totalTickets > 0
            ? (totalAttendees /
                totalTickets) *
            100
            : 0);

    const adminCount =
        members.filter(
            (member) =>
                member.role?.toUpperCase() ===
                'ADMIN',
        ).length;

    const staffCount =
        members.filter(
            (member) =>
                member.role?.toUpperCase() ===
                'STAFF',
        ).length;

    const loading =
        organizationsLoading ||
        statsLoading ||
        eventsLoading ||
        membersLoading;

    /*
     * ============================================================
     * RENDER
     * ============================================================
     */

    return (
        <div className="space-y-6">
            {/* ======================================================
          HEADER
      ====================================================== */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-display text-2xl font-semibold text-ink-900">
                        Organization dashboard
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Manage your organization, events,
                        members, and registrations.
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

            {/* ======================================================
          ORGANIZATION CARD
      ====================================================== */}

            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                            <Building2 className="h-6 w-6 text-brand-600" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Your organization
                            </p>

                            <h3 className="mt-1 truncate font-display text-lg font-semibold text-ink-900">
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

            {/* ======================================================
          PRIMARY STATS
      ====================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Events today"
                    value={
                        loading
                            ? '—'
                            : eventsToday
                    }
                    icon={
                        <CalendarDays className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Total tickets"
                    value={
                        loading
                            ? '—'
                            : totalTickets
                    }
                    icon={
                        <Ticket className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Attendees checked in"
                    value={
                        loading
                            ? '—'
                            : totalAttendees
                    }
                    icon={
                        <Users className="h-5 w-5" />
                    }
                />

                <StatCard
                    label="Attendance rate"
                    value={
                        loading
                            ? '—'
                            : `${Number(
                                attendanceRate,
                            ).toFixed(1)}%`
                    }
                    icon={
                        <BarChart3 className="h-5 w-5" />
                    }
                />
            </div>

            {/* ======================================================
          MEMBERS + REGISTRATIONS
      ====================================================== */}

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Members */}

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Organization members
                            </p>

                            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
                                {loading
                                    ? '—'
                                    : members.length}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                            <Users className="h-5 w-5 text-brand-600" />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Badge tone="blue">
                            {adminCount} admin
                            {adminCount !== 1
                                ? 's'
                                : ''}
                        </Badge>

                        <Badge tone="green">
                            {staffCount} staff
                        </Badge>
                    </div>

                    <Link
                        to="/admin/members"
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                        Manage members
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                {/* Registrations */}

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Total registrations
                            </p>

                            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
                                {loading
                                    ? '—'
                                    : stats?.registrations ??
                                    0}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                            <UserCog className="h-5 w-5 text-brand-600" />
                        </div>
                    </div>

                    <Link
                        to="/admin/registrations"
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                        View registrations
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>

            {/* ======================================================
          EVENT STATISTICS
      ====================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                    label="Total events"
                    value={
                        loading
                            ? '—'
                            : stats?.events ?? 0
                    }
                />

                <MiniStat
                    label="Published"
                    value={
                        loading
                            ? '—'
                            : stats?.published_events ??
                            0
                    }
                />

                <MiniStat
                    label="Upcoming"
                    value={
                        loading
                            ? '—'
                            : stats?.upcoming_events ??
                            0
                    }
                />

                <MiniStat
                    label="This month"
                    value={
                        loading
                            ? '—'
                            : stats?.events_this_month ??
                            0
                    }
                />
            </div>

            {/* ======================================================
          UPCOMING EVENTS
      ====================================================== */}

            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">
                            Upcoming events
                        </h3>

                        <p className="mt-1 text-xs text-ink-500">
                            Upcoming events in your organization.
                        </p>
                    </div>

                    <Link
                        to="/admin/events"
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                        All events →
                    </Link>
                </div>

                <div className="mt-3 divide-y divide-ink-100">
                    {eventsLoading ? (
                        Array.from({
                            length: 3,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 py-4"
                            >
                                <div className="h-11 w-11 animate-pulse rounded-lg bg-ink-100" />

                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
                                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-ink-100" />
                                </div>
                            </div>
                        ))
                    ) : upcomingEvents.length === 0 ? (
                        <div className="py-10 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-ink-300" />

                            <p className="mt-2 text-sm font-medium text-ink-600">
                                No upcoming events
                            </p>

                            <p className="mt-1 text-xs text-ink-400">
                                Create your first event to get started.
                            </p>

                            <Link
                                to="/admin/events/new"
                                className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:text-brand-700"
                            >
                                Create event →
                            </Link>
                        </div>
                    ) : (
                        upcomingEvents
                            .slice(0, 5)
                            .map((event) => {
                                const coverImage =
                                    event.cover_image || '';

                                return (
                                    <div
                                        key={event.id}
                                        className="flex flex-wrap items-center gap-4 py-3"
                                    >
                                        {coverImage ? (
                                            <img
                                                src={resolveMediaUrl(
                                                    coverImage,
                                                )}
                                                alt={
                                                    event.title ||
                                                    'Event cover'
                                                }
                                                className="h-11 w-11 shrink-0 rounded-lg object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.style.display =
                                                        'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500" />
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink-900">
                                                {event.title}
                                            </p>

                                            <p className="text-xs text-ink-500">
                                                {fmtDate(
                                                    event.start_at,
                                                )}

                                                {event.venue
                                                    ? ` • ${event.venue}`
                                                    : ''}

                                                {event.city
                                                    ? `, ${event.city}`
                                                    : ''}
                                            </p>
                                        </div>

                                        <Badge
                                            tone="green"
                                            dot
                                        >
                                            {event.registered_count ??
                                                0}{' '}
                                            registered
                                        </Badge>

                                        <Link
                                            to={`/admin/events/${event.id}/edit`}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                                        >
                                            Manage
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                {label}
            </p>

            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
                {value}
            </p>
        </div>
    );
}