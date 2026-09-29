import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock3,
    MapPin,
    RefreshCw,
    Ticket,
    Users,
    XCircle,
} from 'lucide-react';
import { EventsAPI, OrgsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';

type AdminEvent = {
    id: number;
    title?: string;
    status?: string;
    start_time?: string | null;
    end_time?: string | null;
    registration_deadline?: string | null;
    capacity?: number | null;
    organization_id?: number;
    venue?: string | null;
    city?: string | null;
};

type EventAlert = {
    id: string;
    eventId: number;
    title: string;
    message: string;
    kind: 'deadline' | 'draft' | 'capacity';
    severity: 'warning' | 'info';
};

function getEventDate(event: AdminEvent) {
    if (!event.start_time) return null;

    const date = new Date(event.start_time);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getEventEndDate(event: AdminEvent) {
    if (!event.end_time) return null;

    const date = new Date(event.end_time);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatEventDate(value?: string | null) {
    if (!value) return 'Date not set';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Date not set';
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function isEventLive(event: AdminEvent, now: number) {
    const start = getEventDate(event);

    if (!start) return false;

    const end = getEventEndDate(event);

    if (end) {
        return (
            start.getTime() <= now &&
            now <= end.getTime()
        );
    }

    // If backend has no end time, keep the event live for 24 hours.
    return (
        start.getTime() <= now &&
        now - start.getTime() <=
        24 * 60 * 60 * 1000
    );
}

function isUpcomingWithinThreeDays(
    event: AdminEvent,
    now: number
) {
    const start = getEventDate(event);

    if (!start) return false;

    const startTime = start.getTime();

    return (
        startTime > now &&
        startTime <=
        now + 3 * 24 * 60 * 60 * 1000
    );
}

function isPublished(event: AdminEvent) {
    const status = String(
        event.status || ''
    ).toLowerCase();

    return (
        status === 'published' ||
        status === 'active' ||
        status === 'live'
    );
}

function getCountdown(
    event: AdminEvent,
    now: number
) {
    const start = getEventDate(event);

    if (!start) return 'Date not set';

    if (isEventLive(event, now)) {
        const end = getEventEndDate(event);

        if (end) {
            const remaining =
                end.getTime() - now;

            if (remaining > 0) {
                const totalMinutes = Math.floor(
                    remaining / (1000 * 60)
                );
                const hours = Math.floor(
                    totalMinutes / 60
                );
                const minutes =
                    totalMinutes % 60;

                if (hours > 0) {
                    return `${hours}h ${minutes}m remaining`;
                }

                return `${Math.max(
                    1,
                    minutes
                )}m remaining`;
            }
        }

        return 'Live now';
    }

    const difference =
        start.getTime() - now;

    if (difference <= 0) {
        return 'Starting now';
    }

    const totalMinutes = Math.floor(
        difference / (1000 * 60)
    );
    const days = Math.floor(
        totalMinutes / (60 * 24)
    );
    const hours = Math.floor(
        (totalMinutes % (60 * 24)) / 60
    );
    const minutes = totalMinutes % 60;

    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${Math.max(1, minutes)}m`;
}

function buildEventAlerts(
    events: AdminEvent[],
    now: number
): EventAlert[] {
    const alerts: EventAlert[] = [];

    for (const event of events) {
        if (!event.id || !event.title) {
            continue;
        }

        const start = getEventDate(event);

        if (!start) continue;

        const hoursToStart =
            (start.getTime() - now) /
            (1000 * 60 * 60);

        const deadline = event.registration_deadline
            ? new Date(
                event.registration_deadline
            )
            : null;

        const hoursToDeadline =
            deadline &&
                !Number.isNaN(deadline.getTime())
                ? (deadline.getTime() - now) /
                (1000 * 60 * 60)
                : null;

        if (
            hoursToDeadline !== null &&
            hoursToDeadline > 0 &&
            hoursToDeadline <= 24
        ) {
            alerts.push({
                id: `deadline-${event.id}`,
                eventId: event.id,
                title: 'Registration deadline approaching',
                message:
                    `Registration for ${event.title} closes on ${formatEventDate(
                        event.registration_deadline
                    )}.`,
                kind: 'deadline',
                severity: 'warning',
            });
        }

        if (
            !isPublished(event) &&
            hoursToStart > 0 &&
            hoursToStart <= 72
        ) {
            alerts.push({
                id: `draft-${event.id}`,
                eventId: event.id,
                title: 'Event needs attention',
                message:
                    `${event.title} is not published and starts within the next 3 days.`,
                kind: 'draft',
                severity: 'warning',
            });
        }

        if (
            event.capacity !== null &&
            event.capacity !== undefined &&
            event.capacity <= 0
        ) {
            alerts.push({
                id: `capacity-${event.id}`,
                eventId: event.id,
                title: 'Capacity needs attention',
                message:
                    `${event.title} does not have a positive attendee capacity configured.`,
                kind: 'capacity',
                severity: 'warning',
            });
        }
    }

    return alerts;
}

function getAlertIcon(
    kind: EventAlert['kind']
) {
    switch (kind) {
        case 'deadline':
            return (
                <Clock3 className="h-4 w-4" />
            );

        case 'draft':
            return (
                <XCircle className="h-4 w-4" />
            );

        default:
            return (
                <AlertTriangle className="h-4 w-4" />
            );
    }
}

export function Notifications() {
    const {
        data: organizations = [],
        isLoading: organizationsLoading,
        refetch: refetchOrganizations,
    } = useQuery({
        queryKey: [
            'organizations',
            'admin',
            'notifications',
        ],
        queryFn: () => OrgsAPI.list(),
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    const organization = organizations[0];

    const {
        data: events = [],
        isLoading: eventsLoading,
        isError: eventsError,
        refetch: refetchEvents,
        isFetching,
    } = useQuery({
        queryKey: [
            'events',
            'admin',
            'notifications',
            organization?.id,
        ],
        queryFn: () =>
            EventsAPI.listByOrganization(
                organization!.id,
                {
                    limit: 100,
                }
            ),
        enabled: Boolean(organization?.id),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    // Local clock keeps Live / Upcoming cards accurate even between API calls.
    const [now, setNow] = useState(() =>
        Date.now()
    );

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 30_000);

        return () =>
            window.clearInterval(timer);
    }, []);

    const adminEvents = events as AdminEvent[];

    const liveEvents = useMemo(
        () =>
            adminEvents
                .filter((event) =>
                    isEventLive(event, now)
                )
                .sort(
                    (a, b) =>
                        (getEventDate(a)?.getTime() ?? 0) -
                        (getEventDate(b)?.getTime() ?? 0)
                ),
        [adminEvents, now]
    );

    const upcomingEvents = useMemo(
        () =>
            adminEvents
                .filter((event) =>
                    isUpcomingWithinThreeDays(
                        event,
                        now
                    )
                )
                .sort(
                    (a, b) =>
                        (getEventDate(a)?.getTime() ?? 0) -
                        (getEventDate(b)?.getTime() ?? 0)
                ),
        [adminEvents, now]
    );

    const eventAlerts = useMemo(
        () =>
            buildEventAlerts(
                adminEvents,
                now
            ),
        [adminEvents, now]
    );

    const refresh = async () => {
        await Promise.all([
            refetchOrganizations(),
            refetchEvents(),
        ]);
        setNow(Date.now());
    };

    const loading =
        organizationsLoading || eventsLoading;

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                            Organization
                        </p>

                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Auto updating
                        </span>
                    </div>

                    <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink-950">
                        Notifications
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-ink-500">
                        Live event status, upcoming events,
                        registration deadlines and important
                        event issues for your organization.
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={isFetching}
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${isFetching
                                ? 'animate-spin'
                                : ''
                            }`}
                    />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="mt-7 space-y-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        {Array.from({ length: 2 }).map(
                            (_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-36 rounded-2xl"
                                />
                            )
                        )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map(
                            (_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-40 rounded-2xl"
                                />
                            )
                        )}
                    </div>
                </div>
            ) : !organization ? (
                <div className="mt-7 rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-sm">
                    <Building2 className="mx-auto h-10 w-10 text-ink-300" />
                    <h2 className="mt-3 font-semibold text-ink-900">
                        No organization found
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Create or join an organization before
                        managing its event notifications.
                    </p>
                </div>
            ) : eventsError ? (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <AlertTriangle className="mx-auto h-9 w-9 text-red-500" />
                    <h2 className="mt-3 font-semibold text-red-900">
                        Unable to load event notifications
                    </h2>
                    <p className="mt-1 text-sm text-red-700">
                        We could not load your organization&apos;s
                        current event schedule.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={refresh}
                    >
                        Try again
                    </Button>
                </div>
            ) : (
                <div className="mt-7 space-y-6">
                    {/* Live events */}
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                                    Live now
                                </h2>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    {liveEvents.length}
                                </span>
                            </div>

                            <span className="text-[11px] text-ink-400">
                                Updates automatically
                            </span>
                        </div>

                        {liveEvents.length === 0 ? (
                            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink-800">
                                            No event is live right now
                                        </p>
                                        <p className="mt-1 text-xs text-ink-500">
                                            When an event reaches its start time,
                                            it will automatically appear here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {liveEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
                                    >
                                        <div className="h-1 bg-emerald-500" />

                                        <div className="p-5">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                                    <Calendar className="h-5 w-5" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="text-base font-bold text-ink-950">
                                                            {event.title}
                                                        </h3>

                                                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                            Live
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs text-ink-500">
                                                        Started{' '}
                                                        {formatEventDate(
                                                            event.start_time
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <div className="rounded-xl bg-ink-50 px-3 py-2.5">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                                                        Status
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-emerald-700">
                                                        Live now
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-ink-50 px-3 py-2.5">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                                                        Time
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-ink-800">
                                                        {getCountdown(
                                                            event,
                                                            now
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {(event.venue || event.city) && (
                                                <p className="mt-3 flex items-center gap-1 text-xs text-ink-500">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {event.venue}
                                                    {event.venue && event.city
                                                        ? ' · '
                                                        : ''}
                                                    {event.city}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Next three days */}
                    <section>
                        <div className="mb-3 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-blue-600" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700">
                                Next 3 days
                            </h2>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {upcomingEvents.length}
                            </span>
                        </div>

                        {upcomingEvents.length === 0 ? (
                            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                                <p className="text-sm font-semibold text-ink-800">
                                    No events scheduled in the next 3 days
                                </p>
                                <p className="mt-1 text-xs text-ink-500">
                                    New events in this window will automatically
                                    appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {upcomingEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                <Calendar className="h-5 w-5" />
                                            </div>

                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isPublished(event)
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                {isPublished(event)
                                                    ? 'Upcoming'
                                                    : 'Needs attention'}
                                            </span>
                                        </div>

                                        <h3 className="mt-4 line-clamp-2 text-sm font-bold text-ink-950">
                                            {event.title}
                                        </h3>

                                        <p className="mt-1 text-xs font-medium text-ink-600">
                                            {formatEventDate(
                                                event.start_time
                                            )}
                                        </p>

                                        <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                                                Starts in
                                            </span>
                                            <span className="text-xs font-bold text-brand-700">
                                                {getCountdown(
                                                    event,
                                                    now
                                                )}
                                            </span>
                                        </div>

                                        {(event.venue || event.city) && (
                                            <p className="mt-3 flex items-center gap-1 truncate text-xs text-ink-500">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                {event.venue}
                                                {event.venue && event.city
                                                    ? ' · '
                                                    : ''}
                                                {event.city}
                                            </p>
                                        )}

                                        {event.capacity !== null &&
                                            event.capacity !== undefined && (
                                                <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-400">
                                                    <Users className="h-3.5 w-3.5" />
                                                    Capacity: {event.capacity}
                                                </p>
                                            )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Important event alerts */}
                    {eventAlerts.length > 0 && (
                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700">
                                    Needs attention
                                </h2>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2">
                                {eventAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="mt-0.5 shrink-0">
                                                {getAlertIcon(alert.kind)}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold">
                                                    {alert.title}
                                                </p>
                                                <p className="mt-0.5 text-[11px] leading-5">
                                                    {alert.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-800">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <p>
                            This page is organization-scoped. Event cards are
                            informational only and do not redirect anywhere.
                            The schedule refreshes automatically every minute,
                            while live countdowns update every 30 seconds.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
