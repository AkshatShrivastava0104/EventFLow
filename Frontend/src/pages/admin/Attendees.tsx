import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    RefreshCw,
    Users,
    CalendarDays,
    Ticket,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Mail,
    Building2,
    UserRound,
    AlertCircle,
} from 'lucide-react';

import { EventsAPI, OrgsAPI } from '../../lib/queries';
import api from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

type RawRegistration = {
    id?: number;
    registration_id?: number;
    user_id?: number;
    name?: string;
    user_name?: string;
    attendee_name?: string;
    email?: string;
    user_email?: string;
    attendee_email?: string;
    status?: string;
    payment_status?: string;
    created_at?: string;
    registered_at?: string;
    ticket_id?: number;
    ticket?: {
        id?: number;
    } | null;
    checkin?: {
        id?: number;
        checked_in_at?: string;
    } | null;
};

type EventRegistrationResponse =
    | RawRegistration[]
    | {
        attendees?: RawRegistration[];
        registrations?: RawRegistration[];
        data?: RawRegistration[];
        pagination?: {
            total?: number;
            page?: number;
            limit?: number;
            total_pages?: number;
        };
    };

type AttendeeRow = {
    userId: number;
    name: string;
    email: string;
    events: {
        id: number;
        title: string;
        createdAt: string;
        status: string;
    }[];
    registrationCount: number;
    ticketCount: number;
    checkinCount: number;
    lastActivity: string;
    registrations: {
        id: number;
        eventId: number;
        eventTitle: string;
        status: string;
        paymentStatus: string;
        createdAt: string;
        ticketIssued: boolean;
        checkedIn: boolean;
        checkedInAt?: string;
    }[];
};

function getRows(
    response: EventRegistrationResponse,
): RawRegistration[] {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response.attendees)) {
        return response.attendees;
    }

    if (Array.isArray(response.registrations)) {
        return response.registrations;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    return [];
}

function formatDate(
    value?: string,
    withTime = false,
) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(withTime
            ? {
                hour: '2-digit',
                minute: '2-digit',
            }
            : {}),
    });
}

function getInitials(name: string) {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return '?';

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function statusTone(
    status: string,
): 'green' | 'orange' | 'red' | 'gray' {
    switch (status.toLowerCase()) {
        case 'registered':
        case 'confirmed':
            return 'green';

        case 'pending':
        case 'waitlist':
        case 'waitlisted':
            return 'orange';

        case 'cancelled':
            return 'red';

        default:
            return 'gray';
    }
}

function statusLabel(status: string) {
    switch (status.toLowerCase()) {
        case 'registered':
            return 'Registered';

        case 'confirmed':
            return 'Confirmed';

        case 'waitlist':
        case 'waitlisted':
            return 'Waitlisted';

        case 'cancelled':
            return 'Cancelled';

        case 'pending':
            return 'Pending';

        default:
            return status || 'Unknown';
    }
}

export default function AttendeesAdmin() {
    const [search, setSearch] = useState('');
    const [eventId, setEventId] =
        useState('all');
    const [expandedUserId, setExpandedUserId] =
        useState<number | null>(null);

    const {
        data: organizations = [],
        isLoading: organizationsLoading,
        isError: organizationsError,
    } = useQuery({
        queryKey: ['organizations', 'admin'],
        queryFn: () => OrgsAPI.list(),
        staleTime: 60_000,
    });

    const organization = organizations[0];

    const {
        data: events = [],
        isLoading: eventsLoading,
        isError: eventsError,
    } = useQuery({
        queryKey: [
            'events',
            'admin',
            'attendees',
            organization?.id,
        ],
        queryFn: () =>
            EventsAPI.listByOrganization(
                organization!.id,
                {
                    limit: 100,
                },
            ),
        enabled: Boolean(organization?.id),
        staleTime: 30_000,
    });

    const {
        data: registrationData = [],
        isLoading: registrationsLoading,
        isFetching,
        isError: registrationsError,
        refetch,
    } = useQuery({
        queryKey: [
            'admin',
            'organization-attendees',
            organization?.id,
            events.map((event: any) => event.id).join(','),
        ],
        queryFn: async () => {
            if (!events.length) {
                return [] as {
                    registration: RawRegistration;
                    event: any;
                }[];
            }

            const responses = await Promise.all(
                events.map(async (event: any) => {
                    const response =
                        await api.get<EventRegistrationResponse>(
                            `/events/${event.id}/registrations`,
                            {
                                params: {
                                    page: 1,
                                    limit: 100,
                                },
                            },
                        );

                    return getRows(response.data).map(
                        (registration) => ({
                            registration,
                            event,
                        }),
                    );
                }),
            );

            return responses.flat();
        },
        enabled:
            Boolean(organization?.id) &&
            events.length > 0,
        staleTime: 15_000,
    });

    const attendees = useMemo(() => {
        const map = new Map<
            number,
            AttendeeRow
        >();

        for (const item of registrationData) {
            const registration =
                item.registration;
            const event = item.event;

            const userId = Number(
                registration.user_id ?? 0,
            );

            if (!userId) continue;

            const name =
                registration.name ??
                registration.user_name ??
                registration.attendee_name ??
                'Unknown attendee';

            const email =
                registration.email ??
                registration.user_email ??
                registration.attendee_email ??
                '—';

            const registrationId = Number(
                registration.registration_id ??
                registration.id ??
                0,
            );

            const createdAt =
                registration.created_at ??
                registration.registered_at ??
                '';

            const status = String(
                registration.status ??
                'pending',
            ).toLowerCase();

            const paymentStatus = String(
                registration.payment_status ??
                'unpaid',
            ).toLowerCase();

            const ticketIssued =
                Boolean(
                    registration.ticket_id ??
                    registration.ticket?.id,
                );

            const checkedIn =
                Boolean(
                    registration.checkin?.id,
                );

            const current = map.get(userId);

            const registrationEntry = {
                id: registrationId,
                eventId: Number(event.id),
                eventTitle:
                    event.title ?? 'Unknown event',
                status,
                paymentStatus,
                createdAt,
                ticketIssued,
                checkedIn,
                checkedInAt:
                    registration.checkin
                        ?.checked_in_at,
            };

            if (!current) {
                map.set(userId, {
                    userId,
                    name,
                    email,
                    events: [
                        {
                            id: Number(event.id),
                            title:
                                event.title ??
                                'Unknown event',
                            createdAt,
                            status,
                        },
                    ],
                    registrationCount: 1,
                    ticketCount: ticketIssued
                        ? 1
                        : 0,
                    checkinCount: checkedIn
                        ? 1
                        : 0,
                    lastActivity: createdAt,
                    registrations: [
                        registrationEntry,
                    ],
                });

                continue;
            }

            current.registrationCount += 1;

            if (ticketIssued) {
                current.ticketCount += 1;
            }

            if (checkedIn) {
                current.checkinCount += 1;
            }

            if (
                createdAt &&
                (!current.lastActivity ||
                    new Date(createdAt).getTime() >
                    new Date(
                        current.lastActivity,
                    ).getTime())
            ) {
                current.lastActivity =
                    createdAt;
            }

            if (
                !current.events.some(
                    (existingEvent) =>
                        existingEvent.id ===
                        Number(event.id),
                )
            ) {
                current.events.push({
                    id: Number(event.id),
                    title:
                        event.title ??
                        'Unknown event',
                    createdAt,
                    status,
                });
            }

            current.registrations.push(
                registrationEntry,
            );
        }

        return Array.from(map.values());
    }, [registrationData]);

    const filteredAttendees =
        useMemo(() => {
            const query = search
                .trim()
                .toLowerCase();

            return attendees.filter(
                (attendee) => {
                    if (
                        eventId !== 'all' &&
                        !attendee.events.some(
                            (event) =>
                                String(event.id) ===
                                eventId,
                        )
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    return [
                        attendee.name,
                        attendee.email,
                        ...attendee.events.map(
                            (event) => event.title,
                        ),
                    ]
                        .join(' ')
                        .toLowerCase()
                        .includes(query);
                },
            );
        }, [
            attendees,
            search,
            eventId,
        ]);

    const metrics = useMemo(() => {
        return {
            uniqueAttendees:
                attendees.length,

            registrations:
                attendees.reduce(
                    (sum, attendee) =>
                        sum +
                        attendee.registrationCount,
                    0,
                ),

            ticketsIssued:
                attendees.reduce(
                    (sum, attendee) =>
                        sum +
                        attendee.ticketCount,
                    0,
                ),

            checkedIn:
                attendees.reduce(
                    (sum, attendee) =>
                        sum +
                        attendee.checkinCount,
                    0,
                ),
        };
    }, [attendees]);

    const loading =
        organizationsLoading ||
        eventsLoading ||
        registrationsLoading;

    const hasError =
        organizationsError ||
        eventsError ||
        registrationsError;

    if (loading) {
        return (
            <div className="space-y-5">
                <div>
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-2 h-4 w-80" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({
                        length: 4,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="rounded-2xl border border-ink-200 bg-white p-5"
                        >
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-3 h-8 w-16" />
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <Skeleton className="h-11 w-full" />

                    <div className="mt-4 space-y-3">
                        {Array.from({
                            length: 5,
                        }).map((_, index) => (
                            <Skeleton
                                key={index}
                                className="h-16 w-full"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="space-y-5">
                <div>
                    <h2 className="font-display text-2xl font-semibold text-ink-900">
                        Attendees
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        View unique people registered
                        across your organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                    <h3 className="mt-3 font-semibold text-red-900">
                        Unable to load attendees
                    </h3>

                    <p className="mt-1 text-sm text-red-700">
                        Please refresh and try again.
                    </p>

                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => refetch()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="space-y-5">
                <div>
                    <h2 className="font-display text-2xl font-semibold text-ink-900">
                        Attendees
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        View unique people registered
                        across your organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-ink-300" />

                    <h3 className="mt-3 font-semibold text-ink-900">
                        No organization found
                    </h3>

                    <p className="mt-1 text-sm text-ink-500">
                        Create or join an organization before
                        managing attendees.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand-600">
                        <Building2 className="h-3.5 w-3.5" />
                        {organization.name}
                    </div>

                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
                        Attendees
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm text-ink-500">
                        View unique people registered across
                        your organization and their event
                        activity.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => refetch()}
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

            {/* KPI cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Unique attendees
                        </span>

                        <div className="rounded-xl bg-ink-50 p-2">
                            <Users className="h-4 w-4 text-ink-600" />
                        </div>
                    </div>

                    <p className="mt-3 text-2xl font-bold text-ink-900">
                        {metrics.uniqueAttendees}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Unique registered people
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Registrations
                        </span>

                        <div className="rounded-xl bg-brand-50 p-2">
                            <CalendarDays className="h-4 w-4 text-brand-600" />
                        </div>
                    </div>

                    <p className="mt-3 text-2xl font-bold text-ink-900">
                        {metrics.registrations}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Across your events
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Tickets issued
                        </span>

                        <div className="rounded-xl bg-sky-50 p-2">
                            <Ticket className="h-4 w-4 text-sky-600" />
                        </div>
                    </div>

                    <p className="mt-3 text-2xl font-bold text-ink-900">
                        {metrics.ticketsIssued}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        From ticket data returned by registrations
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Checked in
                        </span>

                        <div className="rounded-xl bg-emerald-50 p-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>

                    <p className="mt-3 text-2xl font-bold text-ink-900">
                        {metrics.checkedIn}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        From persisted check-in data
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                        <Search className="h-4 w-4 shrink-0 text-ink-400" />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search attendees by name or email"
                            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                        />
                    </div>

                    <select
                        value={eventId}
                        onChange={(event) =>
                            setEventId(event.target.value)
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    >
                        <option value="all">
                            All events
                        </option>

                        {events.map((event: any) => (
                            <option
                                key={event.id}
                                value={event.id}
                            >
                                {event.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
                    <p className="text-xs text-ink-500">
                        Showing{' '}
                        <span className="font-semibold text-ink-800">
                            {filteredAttendees.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-ink-800">
                            {attendees.length}
                        </span>{' '}
                        unique attendees
                    </p>

                    {(search ||
                        eventId !== 'all') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setEventId('all');
                                }}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                            >
                                Clear filters
                            </button>
                        )}
                </div>
            </div>

            {/* Attendee table */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
                <div className="border-b border-ink-100 px-5 py-4">
                    <h3 className="font-semibold text-ink-900">
                        Attendee directory
                    </h3>

                    <p className="mt-1 text-xs text-ink-500">
                        One row per unique attendee. Expand a
                        person to see their event activity.
                    </p>
                </div>

                {filteredAttendees.length === 0 ? (
                    <div className="p-10">
                        <EmptyState
                            title={
                                attendees.length === 0
                                    ? 'No attendees found'
                                    : 'No matching attendees'
                            }
                            description={
                                attendees.length === 0
                                    ? 'Attendees will appear here when people register for your events.'
                                    : 'Try changing your search or event filter.'
                            }
                        />
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="border-b border-ink-100 bg-ink-50">
                                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                                        <th className="px-5 py-4">
                                            Attendee
                                        </th>
                                        <th className="px-4 py-4">
                                            Events
                                        </th>
                                        <th className="px-4 py-4">
                                            Registrations
                                        </th>
                                        <th className="px-4 py-4">
                                            Tickets
                                        </th>
                                        <th className="px-4 py-4">
                                            Check-ins
                                        </th>
                                        <th className="px-4 py-4">
                                            Last activity
                                        </th>
                                        <th className="px-4 py-4 text-right">
                                            View
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-ink-100">
                                    {filteredAttendees.map(
                                        (attendee) => {
                                            const expanded =
                                                expandedUserId ===
                                                attendee.userId;

                                            return (
                                                <tr
                                                    key={attendee.userId}
                                                    className="align-top"
                                                >
                                                    <td
                                                        colSpan={7}
                                                        className="p-0"
                                                    >
                                                        <div className="grid grid-cols-[minmax(250px,1.6fr)_minmax(200px,1.4fr)_130px_110px_120px_160px_90px] items-center">
                                                            <div className="px-5 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                                                                        {getInitials(
                                                                            attendee.name,
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-semibold text-ink-900">
                                                                            {attendee.name}
                                                                        </p>

                                                                        <a
                                                                            href={`mailto:${attendee.email}`}
                                                                            className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500 hover:text-brand-600"
                                                                        >
                                                                            <Mail className="h-3 w-3 shrink-0" />
                                                                            {attendee.email}
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {attendee.events
                                                                        .slice(0, 2)
                                                                        .map(
                                                                            (event) => (
                                                                                <span
                                                                                    key={
                                                                                        event.id
                                                                                    }
                                                                                    className="max-w-[170px] truncate rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700"
                                                                                >
                                                                                    {event.title}
                                                                                </span>
                                                                            ),
                                                                        )}

                                                                    {attendee.events
                                                                        .length > 2 && (
                                                                            <span className="rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-500">
                                                                                +
                                                                                {attendee
                                                                                    .events
                                                                                    .length -
                                                                                    2}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                </div>
                                                            </div>

                                                            <div className="px-4 py-4 font-semibold text-ink-800">
                                                                {
                                                                    attendee.registrationCount
                                                                }
                                                            </div>

                                                            <div className="px-4 py-4 font-semibold text-ink-800">
                                                                {
                                                                    attendee.ticketCount
                                                                }
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <span className="inline-flex items-center gap-1.5 font-semibold text-ink-800">
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                                    {
                                                                        attendee.checkinCount
                                                                    }
                                                                </span>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <p className="text-sm font-medium text-ink-700">
                                                                    {formatDate(
                                                                        attendee.lastActivity,
                                                                    )}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-ink-400">
                                                                    Registration activity
                                                                </p>
                                                            </div>

                                                            <div className="px-4 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setExpandedUserId(
                                                                            expanded
                                                                                ? null
                                                                                : attendee.userId,
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                                                                >
                                                                    {expanded
                                                                        ? 'Hide'
                                                                        : 'View'}

                                                                    {expanded ? (
                                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {expanded && (
                                                            <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-5">
                                                                <div className="mb-4 flex items-center gap-2">
                                                                    <UserRound className="h-4 w-4 text-brand-600" />

                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-ink-900">
                                                                            {attendee.name}
                                                                            &apos;s activity
                                                                        </h4>

                                                                        <p className="text-xs text-ink-500">
                                                                            User ID #
                                                                            {
                                                                                attendee.userId
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                                    {attendee.registrations.map(
                                                                        (
                                                                            registration,
                                                                        ) => (
                                                                            <div
                                                                                key={`${attendee.userId}-${registration.id}`}
                                                                                className="rounded-xl border border-ink-200 bg-white p-4"
                                                                            >
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <div className="min-w-0">
                                                                                        <p className="truncate font-semibold text-ink-900">
                                                                                            {
                                                                                                registration.eventTitle
                                                                                            }
                                                                                        </p>

                                                                                        <p className="mt-1 text-xs text-ink-400">
                                                                                            {formatDate(
                                                                                                registration.createdAt,
                                                                                                true,
                                                                                            )}
                                                                                        </p>
                                                                                    </div>

                                                                                    <Badge
                                                                                        tone={statusTone(
                                                                                            registration.status,
                                                                                        )}
                                                                                        dot
                                                                                    >
                                                                                        {statusLabel(
                                                                                            registration.status,
                                                                                        )}
                                                                                    </Badge>
                                                                                </div>

                                                                                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-3">
                                                                                    <div>
                                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                                            Payment
                                                                                        </p>
                                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                                            {
                                                                                                registration.paymentStatus
                                                                                            }
                                                                                        </p>
                                                                                    </div>

                                                                                    <div>
                                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                                            Ticket
                                                                                        </p>
                                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                                            {registration.ticketIssued
                                                                                                ? 'Issued'
                                                                                                : 'Not issued'}
                                                                                        </p>
                                                                                    </div>

                                                                                    <div>
                                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                                            Check-in
                                                                                        </p>
                                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                                            {registration.checkedIn
                                                                                                ? 'Checked in'
                                                                                                : 'Not checked in'}
                                                                                        </p>
                                                                                    </div>

                                                                                    {registration.checkedInAt && (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                                                Checked in at
                                                                                            </p>

                                                                                            <p className="mt-1 text-xs font-medium text-ink-700">
                                                                                                {formatDate(
                                                                                                    registration.checkedInAt,
                                                                                                    true,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="divide-y divide-ink-100 lg:hidden">
                            {filteredAttendees.map(
                                (attendee) => {
                                    const expanded =
                                        expandedUserId ===
                                        attendee.userId;

                                    return (
                                        <div
                                            key={attendee.userId}
                                            className="p-4"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedUserId(
                                                        expanded
                                                            ? null
                                                            : attendee.userId,
                                                    )
                                                }
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                                                        {getInitials(
                                                            attendee.name,
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-ink-900">
                                                                    {attendee.name}
                                                                </p>

                                                                <p className="mt-0.5 truncate text-xs text-ink-500">
                                                                    {attendee.email}
                                                                </p>
                                                            </div>

                                                            {expanded ? (
                                                                <ChevronUp className="h-4 w-4 shrink-0 text-ink-400" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
                                                            )}
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                                            <div className="rounded-lg bg-ink-50 p-2">
                                                                <p className="text-[10px] uppercase text-ink-400">
                                                                    Events
                                                                </p>
                                                                <p className="mt-1 font-semibold text-ink-800">
                                                                    {
                                                                        attendee.events
                                                                            .length
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div className="rounded-lg bg-ink-50 p-2">
                                                                <p className="text-[10px] uppercase text-ink-400">
                                                                    Registrations
                                                                </p>
                                                                <p className="mt-1 font-semibold text-ink-800">
                                                                    {
                                                                        attendee.registrationCount
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div className="rounded-lg bg-ink-50 p-2">
                                                                <p className="text-[10px] uppercase text-ink-400">
                                                                    Check-ins
                                                                </p>
                                                                <p className="mt-1 font-semibold text-ink-800">
                                                                    {
                                                                        attendee.checkinCount
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            {expanded && (
                                                <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
                                                    {attendee.registrations.map(
                                                        (
                                                            registration,
                                                        ) => (
                                                            <div
                                                                key={`${attendee.userId}-${registration.id}`}
                                                                className="rounded-xl border border-ink-200 bg-ink-50/60 p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-semibold text-ink-900">
                                                                            {
                                                                                registration.eventTitle
                                                                            }
                                                                        </p>

                                                                        <p className="mt-1 text-xs text-ink-400">
                                                                            {formatDate(
                                                                                registration.createdAt,
                                                                                true,
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <Badge
                                                                        tone={statusTone(
                                                                            registration.status,
                                                                        )}
                                                                        dot
                                                                    >
                                                                        {statusLabel(
                                                                            registration.status,
                                                                        )}
                                                                    </Badge>
                                                                </div>

                                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <p className="text-[10px] uppercase text-ink-400">
                                                                            Payment
                                                                        </p>
                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                            {
                                                                                registration.paymentStatus
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[10px] uppercase text-ink-400">
                                                                            Ticket
                                                                        </p>
                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                            {registration.ticketIssued
                                                                                ? 'Issued'
                                                                                : 'Not issued'}
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[10px] uppercase text-ink-400">
                                                                            Check-in
                                                                        </p>
                                                                        <p className="mt-1 text-xs font-medium text-ink-700">
                                                                            {registration.checkedIn
                                                                                ? 'Checked in'
                                                                                : 'Not checked in'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />

                <p>
                    Attendees are derived from the real
                    registrations of your organization&apos;s events.
                    No platform-wide users or fabricated activity is
                    shown here.
                </p>
            </div>
        </div>
    );
}
