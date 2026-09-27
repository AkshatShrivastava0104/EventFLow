import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    CalendarDays,
    Users,
    Ticket,
    UserCheck,
    Activity,
    CheckCircle2,
    Clock3,
    XCircle,
} from 'lucide-react';

import {
    StatsAPI,
    OrgsAPI,
    type AnalyticsRange,
} from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { fmtDate } from '../../lib/utils';

export function Analytics() {
    const [selectedOrganizationId, setSelectedOrganizationId] =
        useState<string>('');

    const [selectedRange, setSelectedRange] =
        useState<AnalyticsRange>('30d');

    /*
     * ----------------------------------------------------------
     * Organizations
     * ----------------------------------------------------------
     *
     * We fetch the organizations available to the logged-in user.
     * This allows the analytics page to work even if an ADMIN
     * belongs to more than one organization.
     */
    const {
        data: organizationsData,
        isLoading: organizationsLoading,
    } = useQuery({
        queryKey: ['organizations'],
        queryFn: () => OrgsAPI.list(),
    });

    const organizations = useMemo(() => {
        if (Array.isArray(organizationsData)) {
            return organizationsData;
        }

        return [];
    }, [organizationsData]);

    /*
     * Select the first organization automatically.
     */
    const activeOrganizationId =
        selectedOrganizationId ||
        (organizations.length > 0
            ? String(organizations[0].id)
            : '');

    const activeOrganization = useMemo(() => {
        return organizations.find(
            (organization: any) =>
                String(organization.id) ===
                String(activeOrganizationId)
        );
    }, [organizations, activeOrganizationId]);

    /*
     * ----------------------------------------------------------
     * Organization Stats
     * ----------------------------------------------------------
     */
    const {
        data: stats,
        isLoading: statsLoading,
        isError: statsError,
    } = useQuery({
        queryKey: [
            'organization-stats',
            activeOrganizationId,
            selectedRange,
        ],
        queryFn: () =>
            StatsAPI.organization(
                activeOrganizationId,
                selectedRange,
            ),
        enabled: Boolean(activeOrganizationId),
    });

    const isLoading =
        organizationsLoading || statsLoading;

    /*
     * ----------------------------------------------------------
     * Normalize stats
     * ----------------------------------------------------------
     */
    const normalizedStats = useMemo(() => {
        const value: any = stats ?? {};

        return {
            organizationName:
                value.organization_name ??
                value.organizationName ??
                activeOrganization?.name ??
                'Organization',

            events: Number(value.events ?? 0),

            upcomingEvents: Number(
                value.upcoming_events ??
                value.upcomingEvents ??
                0
            ),

            publishedEvents: Number(
                value.published_events ??
                value.publishedEvents ??
                0
            ),

            draftEvents: Number(
                value.draft_events ??
                value.draftEvents ??
                0
            ),

            cancelledEvents: Number(
                value.cancelled_events ??
                value.cancelledEvents ??
                0
            ),

            completedEvents: Number(
                value.completed_events ??
                value.completedEvents ??
                0
            ),

            registrations: Number(
                value.registrations ?? 0
            ),

            activeRegistrations: Number(
                value.active_registrations ??
                value.activeRegistrations ??
                0
            ),

            tickets: Number(value.tickets ?? 0),

            checkIns: Number(
                value.check_ins ??
                value.checkIns ??
                0
            ),

            attendanceRate: Number(
                value.attendance_rate ??
                value.attendanceRate ??
                0
            ),

            members: Number(value.members ?? 0),

            admins: Number(value.admins ?? 0),

            staff: Number(value.staff ?? 0),

            registrationsThisMonth: Number(
                value.registrations_this_month ??
                value.registrationsThisMonth ??
                0
            ),

            eventsThisMonth: Number(
                value.events_this_month ??
                value.eventsThisMonth ??
                0
            ),

            monthly: Array.isArray(value.monthly)
                ? value.monthly
                : [],

            topEvents: Array.isArray(
                value.top_events
            )
                ? value.top_events
                : Array.isArray(value.topEvents)
                    ? value.topEvents
                    : [],

            upcoming: Array.isArray(
                value.upcoming
            )
                ? value.upcoming
                : [],
        };
    }, [
        stats,
        activeOrganization,
    ]);

    /*
     * ----------------------------------------------------------
     * Monthly chart data
     * ----------------------------------------------------------
     */
    const monthlyData = useMemo(() => {
        return normalizedStats.monthly.map(
            (item: any) => ({
                month:
                    item.month ??
                    item.name ??
                    '',

                events: Number(
                    item.events ?? 0
                ),

                registrations: Number(
                    item.registrations ?? 0
                ),

                checkIns: Number(
                    item.check_ins ??
                    item.checkIns ??
                    0
                ),
            })
        );
    }, [normalizedStats.monthly]);

    /*
     * ----------------------------------------------------------
     * Event status chart
     * ----------------------------------------------------------
     */
    const eventStatusData = useMemo(() => {
        return [
            {
                name: 'Published',
                value: normalizedStats.publishedEvents,
            },
            {
                name: 'Draft',
                value: normalizedStats.draftEvents,
            },
            {
                name: 'Completed',
                value: normalizedStats.completedEvents,
            },
            {
                name: 'Cancelled',
                value: normalizedStats.cancelledEvents,
            },
        ].filter((item) => item.value > 0);
    }, [normalizedStats]);

    /*
     * ----------------------------------------------------------
     * Top events
     * ----------------------------------------------------------
     */
    const topEvents = useMemo(() => {
        return normalizedStats.topEvents.map(
            (event: any) => ({
                ...event,

                title:
                    event.title ??
                    'Untitled event',

                registrations: Number(
                    event.registrations ?? 0
                ),

                checkIns: Number(
                    event.check_ins ??
                    event.checkIns ??
                    0
                ),

                attendanceRate: Number(
                    event.attendance_rate ??
                    event.attendanceRate ??
                    0
                ),

                capacity:
                    event.capacity !== null &&
                        event.capacity !== undefined
                        ? Number(event.capacity)
                        : null,

                startTime:
                    event.start_time ??
                    event.startTime ??
                    null,
            })
        );
    }, [normalizedStats.topEvents]);

    /*
     * ----------------------------------------------------------
     * Upcoming events
     * ----------------------------------------------------------
     */
    const upcomingEvents = useMemo(() => {
        return normalizedStats.upcoming.map(
            (event: any) => ({
                ...event,

                title:
                    event.title ??
                    'Untitled event',

                registrations: Number(
                    event.registrations ?? 0
                ),

                checkIns: Number(
                    event.check_ins ??
                    event.checkIns ??
                    0
                ),

                capacity:
                    event.capacity !== null &&
                        event.capacity !== undefined
                        ? Number(event.capacity)
                        : null,

                startTime:
                    event.start_time ??
                    event.startTime ??
                    null,

                endTime:
                    event.end_time ??
                    event.endTime ??
                    null,

                venue:
                    event.venue ??
                    '',
            })
        );
    }, [normalizedStats.upcoming]);

    /*
     * ----------------------------------------------------------
     * Attendance percentage
     * ----------------------------------------------------------
     */
    const attendanceRate = Math.max(
        0,
        Math.min(
            100,
            normalizedStats.attendanceRate
        )
    );

    /*
     * ----------------------------------------------------------
     * Loading state
     * ----------------------------------------------------------
     */
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-72" />
                    </div>

                    <Skeleton className="h-10 w-52 rounded-xl" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map(
                        (_, index) => (
                            <Skeleton
                                key={index}
                                className="h-32 rounded-2xl"
                            />
                        )
                    )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-80 rounded-2xl" />
                    <Skeleton className="h-80 rounded-2xl" />
                </div>

                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    /*
     * ----------------------------------------------------------
     * No organization
     * ----------------------------------------------------------
     */
    if (!activeOrganizationId) {
        return (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                <Users className="mx-auto h-10 w-10 text-ink-300" />

                <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">
                    No organization found
                </h3>

                <p className="mt-1 text-sm text-ink-500">
                    You need to belong to an organization to
                    view organization analytics.
                </p>
            </div>
        );
    }

    /*
     * ----------------------------------------------------------
     * Error state
     * ----------------------------------------------------------
     */
    if (statsError) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
                <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 text-red-500" />

                    <div>
                        <h3 className="font-semibold text-red-900">
                            Unable to load analytics
                        </h3>

                        <p className="mt-1 text-sm text-red-700">
                            We could not load analytics for this
                            organization. Please try again.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ======================================================
          Header
      ====================================================== */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-medium text-brand-600">
                        Organization analytics
                    </p>

                    <h2 className="font-display text-2xl font-semibold text-ink-900">
                        Analytics
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Understand your events, registrations and
                        attendee engagement for the selected period.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {organizations.length > 1 && (
                        <select
                            value={activeOrganizationId}
                            onChange={(event) =>
                                setSelectedOrganizationId(
                                    event.target.value
                                )
                            }
                            className="h-10 min-w-[220px] rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        >
                            {organizations.map(
                                (organization: any) => (
                                    <option
                                        key={organization.id}
                                        value={organization.id}
                                    >
                                        {organization.name}
                                    </option>
                                )
                            )}
                        </select>
                    )}

                    <div className="flex items-center rounded-xl border border-ink-200 bg-white p-1">
                        {(
                            [
                                ['7d', '7 days'],
                                ['30d', '30 days'],
                                ['90d', '90 days'],
                                ['12m', '12 months'],
                            ] as const
                        ).map(([range, label]) => (
                            <button
                                key={range}
                                type="button"
                                onClick={() =>
                                    setSelectedRange(range)
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${selectedRange === range
                                        ? 'bg-ink-900 text-white'
                                        : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======================================================
          Primary Stats
      ====================================================== */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Events in period"
                    value={normalizedStats.events}
                    delta={`${normalizedStats.publishedEvents} published`}
                    tone="positive"
                />

                <StatCard
                    label="Registrations in period"
                    value={
                        normalizedStats.activeRegistrations
                    }
                    delta={`${normalizedStats.activeRegistrations} active`}
                    tone="positive"
                />

                <StatCard
                    label="Tickets in period"
                    value={normalizedStats.tickets}
                    delta={`${normalizedStats.checkIns} checked in`}
                    tone="positive"
                />

                <StatCard
                    label="Attendance rate"
                    value={`${Math.round(attendanceRate)}%`}
                    delta={`${normalizedStats.checkIns} check-ins`}
                    tone={
                        attendanceRate >= 60
                            ? 'positive'
                            : 'negative'
                    }
                />
            </div>

            {/* ======================================================
          Secondary Stats
      ====================================================== */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Upcoming events
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {normalizedStats.upcomingEvents}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Events this month
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {normalizedStats.eventsThisMonth}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                            <Activity className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Organization members
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {normalizedStats.members}
                            </p>

                            <p className="mt-1 text-xs text-ink-500">
                                {normalizedStats.admins} admins ·{' '}
                                {normalizedStats.staff} staff
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Completed events
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {normalizedStats.completedEvents}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================
          Charts
      ====================================================== */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Registration Trend */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display text-lg font-semibold text-ink-900">
                                Registration trend
                            </h3>

                            <p className="mt-1 text-xs text-ink-500">
                                Registrations and check-ins across the selected period.
                            </p>
                        </div>

                        <Ticket className="h-5 w-5 text-ink-300" />
                    </div>

                    <div className="mt-5 h-72">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#eef0f2"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        tick={{
                                            fill: '#7c8894',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                        tick={{
                                            fill: '#7c8894',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: '1px solid #eef0f2',
                                            fontSize: 12,
                                        }}
                                    />

                                    <Legend />

                                    <Line
                                        type="monotone"
                                        dataKey="registrations"
                                        name="Registrations"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        dot={{ r: 4 }}
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="checkIns"
                                        name="Check-ins"
                                        stroke="#0ea5e9"
                                        strokeWidth={2.5}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-ink-400">
                                No registration data available.
                            </div>
                        )}
                    </div>
                </div>

                {/* Events Trend */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display text-lg font-semibold text-ink-900">
                                Event activity
                            </h3>

                            <p className="mt-1 text-xs text-ink-500">
                                Events created across the selected period.
                            </p>
                        </div>

                        <CalendarDays className="h-5 w-5 text-ink-300" />
                    </div>

                    <div className="mt-5 h-72">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#eef0f2"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        tick={{
                                            fill: '#7c8894',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                        tick={{
                                            fill: '#7c8894',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: '1px solid #eef0f2',
                                            fontSize: 12,
                                        }}
                                    />

                                    <Bar
                                        dataKey="events"
                                        name="Events"
                                        fill="#0ea5e9"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-ink-400">
                                No event data available.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ======================================================
          Event Status + Attendance
      ====================================================== */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Event Status */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">
                            Event status
                        </h3>

                        <p className="mt-1 text-xs text-ink-500">
                            Event status distribution for the selected period.
                        </p>
                    </div>

                    <div className="mt-5 flex h-64 items-center justify-center">
                        {eventStatusData.length > 0 ? (
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <PieChart>
                                    <Pie
                                        data={eventStatusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                    >
                                        {eventStatusData.map(
                                            (_: any, index: number) => (
                                                <Cell
                                                    key={`status-${index}`}
                                                    fill={
                                                        [
                                                            '#10b981',
                                                            '#94a3b8',
                                                            '#0ea5e9',
                                                            '#ef4444',
                                                        ][index % 4]
                                                    }
                                                />
                                            )
                                        )}
                                    </Pie>

                                    <Tooltip />

                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-sm text-ink-400">
                                No event data available.
                            </div>
                        )}
                    </div>
                </div>

                {/* Attendance */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display text-lg font-semibold text-ink-900">
                                Attendance
                            </h3>

                            <p className="mt-1 text-xs text-ink-500">
                                Registration-to-check-in conversion.
                            </p>
                        </div>

                        <UserCheck className="h-5 w-5 text-ink-300" />
                    </div>

                    <div className="mt-8">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-4xl font-semibold text-ink-900">
                                    {Math.round(attendanceRate)}%
                                </p>

                                <p className="mt-1 text-sm text-ink-500">
                                    attendee check-in rate
                                </p>
                            </div>

                            <div className="text-right text-xs text-ink-500">
                                <p>
                                    {normalizedStats.checkIns}{' '}
                                    checked in
                                </p>

                                <p>
                                    {normalizedStats.activeRegistrations}{' '}
                                    active registrations
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 h-3 overflow-hidden rounded-full bg-ink-100">
                            <div
                                className="h-full rounded-full bg-brand-500 transition-all"
                                style={{
                                    width: `${attendanceRate}%`,
                                }}
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-ink-50 p-3">
                                <p className="text-xs text-ink-500">
                                    Registrations
                                </p>

                                <p className="mt-1 text-lg font-semibold text-ink-900">
                                    {normalizedStats.activeRegistrations}
                                </p>
                            </div>

                            <div className="rounded-xl bg-ink-50 p-3">
                                <p className="text-xs text-ink-500">
                                    Check-ins
                                </p>

                                <p className="mt-1 text-lg font-semibold text-ink-900">
                                    {normalizedStats.checkIns}
                                </p>
                            </div>

                            <div className="rounded-xl bg-ink-50 p-3">
                                <p className="text-xs text-ink-500">
                                    Pending
                                </p>

                                <p className="mt-1 text-lg font-semibold text-ink-900">
                                    {Math.max(
                                        0,
                                        normalizedStats.activeRegistrations -
                                        normalizedStats.checkIns
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================
          Top Events
      ====================================================== */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">
                            Top events
                        </h3>

                        <p className="mt-1 text-xs text-ink-500">
                            Events ranked by registrations in the selected period.
                        </p>
                    </div>

                    <Activity className="h-5 w-5 text-ink-300" />
                </div>

                <div className="mt-5 h-80">
                    {topEvents.length > 0 ? (
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <BarChart
                                data={topEvents}
                                layout="vertical"
                                margin={{
                                    left: 10,
                                    right: 20,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#eef0f2"
                                    horizontal={false}
                                />

                                <XAxis
                                    type="number"
                                    allowDecimals={false}
                                    tick={{
                                        fill: '#7c8894',
                                        fontSize: 11,
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <YAxis
                                    dataKey="title"
                                    type="category"
                                    width={190}
                                    tick={{
                                        fill: '#2b333d',
                                        fontSize: 11,
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #eef0f2',
                                        fontSize: 12,
                                    }}
                                />

                                <Bar
                                    dataKey="registrations"
                                    name="Registrations"
                                    fill="#f97316"
                                    radius={[0, 8, 8, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-ink-400">
                            No event data available.
                        </div>
                    )}
                </div>
            </div>

            {/* ======================================================
          Upcoming Events
      ====================================================== */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">
                            Upcoming events
                        </h3>

                        <p className="mt-1 text-xs text-ink-500">
                            Your next published events and their
                            registration progress.
                        </p>
                    </div>

                    <Clock3 className="h-5 w-5 text-ink-300" />
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="mt-5 divide-y divide-ink-100">
                        {upcomingEvents.map(
                            (event: any) => {
                                const capacity =
                                    event.capacity;

                                const registrationProgress =
                                    capacity &&
                                        capacity > 0
                                        ? Math.min(
                                            100,
                                            (event.registrations /
                                                capacity) *
                                            100
                                        )
                                        : null;

                                return (
                                    <div
                                        key={event.id}
                                        className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="truncate font-semibold text-ink-900">
                                                    {event.title}
                                                </h4>

                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600">
                                                    Published
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                                                {event.startTime && (
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="h-3.5 w-3.5" />

                                                        {fmtDate(
                                                            event.startTime,
                                                            'MMM d, yyyy · h:mm a'
                                                        )}
                                                    </span>
                                                )}

                                                {event.venue && (
                                                    <span>
                                                        {event.venue}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full max-w-md">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-ink-700">
                                                    {event.registrations}{' '}
                                                    registrations
                                                </span>

                                                <span className="text-ink-500">
                                                    {event.capacity
                                                        ? `${event.capacity} capacity`
                                                        : 'No capacity limit'}
                                                </span>
                                            </div>

                                            {registrationProgress !==
                                                null && (
                                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                                                        <div
                                                            className="h-full rounded-full bg-brand-500"
                                                            style={{
                                                                width: `${registrationProgress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                            <div className="mt-1 flex justify-between text-[11px] text-ink-400">
                                                <span>
                                                    {event.checkIns}{' '}
                                                    checked in
                                                </span>

                                                {event.capacity &&
                                                    event.capacity > 0 && (
                                                        <span>
                                                            {Math.round(
                                                                registrationProgress ??
                                                                0
                                                            )}
                                                            % filled
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                ) : (
                    <div className="mt-6 rounded-xl bg-ink-50 p-8 text-center">
                        <CalendarDays className="mx-auto h-8 w-8 text-ink-300" />

                        <p className="mt-3 text-sm font-medium text-ink-700">
                            No upcoming events
                        </p>

                        <p className="mt-1 text-xs text-ink-400">
                            Published upcoming events will appear
                            here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}