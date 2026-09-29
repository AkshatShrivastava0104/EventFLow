import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    RefreshCw,
    Ticket,
    CheckCircle2,
    Clock3,
    CreditCard,
    Activity,
    CalendarDays,
    UserRound,
    Mail,
    Building2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

import { EventsAPI, OrgsAPI } from '../../lib/queries';
import api from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

type Registration = {
    id?: number;
    registration_id?: number;
    user_id?: number;
    name?: string;
    user_name?: string;
    email?: string;
    user_email?: string;
    status?: string;
    payment_status?: string;
    created_at?: string;
    registered_at?: string;
};

type TicketRow = {
    registrationId: number;
    userId: number;
    attendeeName: string;
    attendeeEmail: string;
    eventId: number;
    eventTitle: string;
    eventStart?: string;
    registrationStatus: string;
    paymentStatus: string;
    registeredAt: string;
    ticketIssued: boolean;
};

function getRegistrations(
    data: unknown,
): Registration[] {
    if (Array.isArray(data)) {
        return data;
    }

    if (
        data &&
        typeof data === 'object'
    ) {
        const value = data as {
            attendees?: Registration[];
            registrations?: Registration[];
            data?: Registration[];
        };

        if (Array.isArray(value.attendees)) {
            return value.attendees;
        }

        if (
            Array.isArray(value.registrations)
        ) {
            return value.registrations;
        }

        if (Array.isArray(value.data)) {
            return value.data;
        }
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

    return new Intl.DateTimeFormat(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...(withTime
                ? {
                    hour: '2-digit',
                    minute: '2-digit',
                }
                : {}),
        },
    ).format(date);
}

function getStatusTone(
    status: string,
): 'green' | 'orange' | 'red' | 'gray' {
    switch (status) {
        case 'registered':
        case 'confirmed':
            return 'green';

        case 'pending':
            return 'orange';

        case 'cancelled':
            return 'red';

        default:
            return 'gray';
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'registered':
            return 'Registered';

        case 'confirmed':
            return 'Confirmed';

        case 'pending':
            return 'Pending';

        case 'cancelled':
            return 'Cancelled';

        default:
            return status || 'Unknown';
    }
}

function getInitials(name: string) {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return (
        parts
            .slice(0, 2)
            .map((part) =>
                part[0]?.toUpperCase(),
            )
            .join('') || '?'
    );
}

export default function TicketsAdmin() {
    const [search, setSearch] =
        useState('');

    const [eventId, setEventId] =
        useState('all');

    const [ticketStatus, setTicketStatus] =
        useState<
            'all' | 'issued' | 'awaiting'
        >('all');

    const [checkinFilter, setCheckinFilter] =
        useState<
            'all' | 'checked_in' | 'not_checked_in'
        >('all');

    const [expandedId, setExpandedId] =
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
            'tickets',
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
        data: registrationGroups = [],
        isLoading: registrationsLoading,
        isFetching,
        isError: registrationsError,
        refetch,
    } = useQuery({
        queryKey: [
            'admin',
            'organization-tickets',
            organization?.id,
            events
                .map((event: any) => event.id)
                .join(','),
        ],
        queryFn: async () => {
            if (!events.length) {
                return [] as TicketRow[];
            }

            const responses =
                await Promise.all(
                    events.map(async (event: any) => {
                        const response =
                            await api.get(
                                `/events/${event.id}/registrations`,
                                {
                                    params: {
                                        page: 1,
                                        limit: 100,
                                    },
                                },
                            );

                        const registrations =
                            getRegistrations(
                                response.data,
                            );

                        return registrations.map(
                            (registration) => {
                                const status =
                                    String(
                                        registration.status ??
                                        'pending',
                                    ).toLowerCase();

                                const paymentStatus =
                                    String(
                                        registration.payment_status ??
                                        'unpaid',
                                    ).toLowerCase();

                                /*
                                 * Current backend creates a ticket
                                 * immediately for a successful/free
                                 * registration. Paid registrations
                                 * waiting for payment do not receive a
                                 * ticket yet.
                                 */
                                const ticketIssued =
                                    status ===
                                    'registered' &&
                                    paymentStatus !==
                                    'pending';

                                return {
                                    registrationId: Number(
                                        registration.registration_id ??
                                        registration.id ??
                                        0,
                                    ),
                                    userId: Number(
                                        registration.user_id ??
                                        0,
                                    ),
                                    attendeeName:
                                        registration.name ??
                                        registration.user_name ??
                                        'Unknown attendee',
                                    attendeeEmail:
                                        registration.email ??
                                        registration.user_email ??
                                        '—',
                                    eventId: Number(
                                        event.id,
                                    ),
                                    eventTitle:
                                        event.title ??
                                        'Unknown event',
                                    eventStart:
                                        event.start_time ??
                                        event.start_at ??
                                        event.startTime ??
                                        undefined,
                                    registrationStatus:
                                        status,
                                    paymentStatus,
                                    registeredAt:
                                        registration.created_at ??
                                        registration.registered_at ??
                                        '',
                                    ticketIssued,
                                };
                            },
                        );
                    }),
                );

            return responses
                .flat()
                .filter(
                    (row) =>
                        row.registrationId > 0 &&
                        row.userId > 0,
                );
        },
        enabled:
            Boolean(organization?.id) &&
            events.length > 0,
        staleTime: 15_000,
    });

    const filteredRows = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();

        return registrationGroups
            .filter((row) => {
                if (
                    eventId !== 'all' &&
                    String(row.eventId) !==
                    eventId
                ) {
                    return false;
                }

                if (
                    ticketStatus === 'issued' &&
                    !row.ticketIssued
                ) {
                    return false;
                }

                if (
                    ticketStatus === 'awaiting' &&
                    row.ticketIssued
                ) {
                    return false;
                }

                if (query) {
                    const searchable = [
                        row.attendeeName,
                        row.attendeeEmail,
                        row.eventTitle,
                        String(row.registrationId),
                    ]
                        .join(' ')
                        .toLowerCase();

                    if (
                        !searchable.includes(query)
                    ) {
                        return false;
                    }
                }

                return true;
            })
            .sort(
                (a, b) =>
                    new Date(
                        b.registeredAt,
                    ).getTime() -
                    new Date(
                        a.registeredAt,
                    ).getTime(),
            );
    }, [
        registrationGroups,
        search,
        eventId,
        ticketStatus,
    ]);

    /*
     * The current organization registration API
     * does not expose persisted check-in information.
     * Therefore we deliberately do not invent check-in
     * state here.
     */
    const metrics = useMemo(() => {
        const tickets = registrationGroups.filter(
            (row) => row.ticketIssued,
        );

        const awaiting =
            registrationGroups.filter(
                (row) => !row.ticketIssued,
            );

        const paid =
            registrationGroups.filter(
                (row) =>
                    row.paymentStatus === 'paid',
            );

        const unpaid =
            registrationGroups.filter(
                (row) =>
                    row.paymentStatus ===
                    'unpaid',
            );

        return {
            tickets: tickets.length,
            awaiting: awaiting.length,
            paid: paid.length,
            unpaid: unpaid.length,
        };
    }, [registrationGroups]);

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
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="mt-2 h-4 w-96" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({
                        length: 4,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="rounded-2xl border border-ink-200 bg-white p-5"
                        >
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="mt-3 h-8 w-16" />
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <Skeleton className="h-11 w-full" />

                    <div className="mt-4 space-y-3">
                        {Array.from({
                            length: 6,
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
                        Tickets
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Monitor tickets issued for your
                        organization&apos;s events.
                    </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                    <h3 className="mt-3 font-semibold text-red-900">
                        Unable to load tickets
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
                        Tickets
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Monitor tickets issued for your
                        organization&apos;s events.
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-ink-300" />

                    <h3 className="mt-3 font-semibold text-ink-900">
                        No organization found
                    </h3>

                    <p className="mt-1 text-sm text-ink-500">
                        Create or join an organization before
                        managing tickets.
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
                        Tickets
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm text-ink-500">
                        Monitor ticket issuance across your
                        organization&apos;s events.
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

            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={
                        <Ticket className="h-4 w-4" />
                    }
                    label="Tickets issued"
                    value={metrics.tickets}
                    hint="Issued for registrations"
                />

                <MetricCard
                    icon={
                        <Clock3 className="h-4 w-4" />
                    }
                    label="Awaiting"
                    value={metrics.awaiting}
                    hint="No ticket yet"
                />

                <MetricCard
                    icon={
                        <CircleDollarIcon className="h-4 w-4" />
                    }
                    label="Paid"
                    value={metrics.paid}
                    hint="Paid registrations"
                />

                <MetricCard
                    icon={
                        <CreditCard className="h-4 w-4" />
                    }
                    label="Unpaid"
                    value={metrics.unpaid}
                    hint="Payment pending/unpaid"
                />
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_210px]">
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                        <Search className="h-4 w-4 shrink-0 text-ink-400" />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search ticket, attendee, email or event..."
                            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                        />
                    </div>

                    <select
                        value={eventId}
                        onChange={(event) =>
                            setEventId(
                                event.target.value,
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
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

                    <select
                        value={ticketStatus}
                        onChange={(event) =>
                            setTicketStatus(
                                event.target.value as
                                | 'all'
                                | 'issued'
                                | 'awaiting',
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                    >
                        <option value="all">
                            All ticket states
                        </option>
                        <option value="issued">
                            Ticket issued
                        </option>
                        <option value="awaiting">
                            Awaiting ticket
                        </option>
                    </select>

                    <select
                        value={checkinFilter}
                        onChange={(event) =>
                            setCheckinFilter(
                                event.target.value as
                                | 'all'
                                | 'checked_in'
                                | 'not_checked_in',
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                    >
                        <option value="all">
                            Check-in: not available here
                        </option>
                        <option
                            value="checked_in"
                            disabled
                        >
                            Checked in
                        </option>
                        <option
                            value="not_checked_in"
                            disabled
                        >
                            Not checked in
                        </option>
                    </select>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                    <p className="text-xs text-ink-500">
                        Showing{' '}
                        <span className="font-semibold text-ink-800">
                            {filteredRows.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-ink-800">
                            {registrationGroups.length}
                        </span>{' '}
                        ticketable registrations
                    </p>

                    <span className="hidden text-xs text-ink-400 sm:block">
                        Check-in operations are handled by
                        Staff.
                    </span>
                </div>
            </div>

            {/* Directory */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
                <div className="border-b border-ink-100 px-5 py-4">
                    <h3 className="font-semibold text-ink-900">
                        Ticket directory
                    </h3>

                    <p className="mt-1 text-xs text-ink-500">
                        Ticket issuance for {organization.name}.
                    </p>
                </div>

                {filteredRows.length === 0 ? (
                    <div className="p-10">
                        <EmptyState
                            title={
                                registrationGroups.length ===
                                    0
                                    ? 'No tickets found'
                                    : 'No matching tickets'
                            }
                            description={
                                registrationGroups.length ===
                                    0
                                    ? 'Tickets will appear here when attendees successfully register for your events.'
                                    : 'Try changing your search or filters.'
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="border-b border-ink-100 bg-ink-50">
                                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                                        <th className="px-5 py-4">
                                            Ticket
                                        </th>
                                        <th className="px-4 py-4">
                                            Attendee
                                        </th>
                                        <th className="px-4 py-4">
                                            Event
                                        </th>
                                        <th className="px-4 py-4">
                                            Registered
                                        </th>
                                        <th className="px-4 py-4">
                                            Registration
                                        </th>
                                        <th className="px-4 py-4">
                                            Payment
                                        </th>
                                        <th className="px-4 py-4 text-right">
                                            View
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-ink-100">
                                    {filteredRows.map(
                                        (row) => {
                                            const expanded =
                                                expandedId ===
                                                row.registrationId;

                                            return (
                                                <tr
                                                    key={`${row.eventId}-${row.registrationId}`}
                                                >
                                                    <td
                                                        colSpan={7}
                                                        className="p-0"
                                                    >
                                                        <div className="grid grid-cols-[150px_minmax(240px,1.5fr)_minmax(220px,1.4fr)_150px_145px_120px_90px] items-center">
                                                            <div className="px-5 py-4">
                                                                <div className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700">
                                                                    <Ticket className="h-3.5 w-3.5" />
                                                                    {row.ticketIssued
                                                                        ? 'Issued'
                                                                        : 'Awaiting'}
                                                                </div>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-50 text-xs font-semibold text-ink-700">
                                                                        {getInitials(
                                                                            row.attendeeName,
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-semibold text-ink-900">
                                                                            {
                                                                                row.attendeeName
                                                                            }
                                                                        </p>

                                                                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                                                                            <Mail className="h-3 w-3" />
                                                                            {
                                                                                row.attendeeEmail
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <p className="truncate font-medium text-ink-800">
                                                                    {row.eventTitle}
                                                                </p>

                                                                {row.eventStart && (
                                                                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                                                                        <CalendarDays className="h-3 w-3" />
                                                                        {formatDate(
                                                                            row.eventStart,
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <p className="font-medium text-ink-700">
                                                                    {formatDate(
                                                                        row.registeredAt,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <Badge
                                                                    tone={getStatusTone(
                                                                        row.registrationStatus,
                                                                    )}
                                                                    dot
                                                                >
                                                                    {getStatusLabel(
                                                                        row.registrationStatus,
                                                                    )}
                                                                </Badge>
                                                            </div>

                                                            <div className="px-4 py-4">
                                                                <Badge
                                                                    tone={
                                                                        row.paymentStatus ===
                                                                            'paid'
                                                                            ? 'green'
                                                                            : 'orange'
                                                                    }
                                                                >
                                                                    {row.paymentStatus}
                                                                </Badge>
                                                            </div>

                                                            <div className="px-4 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setExpandedId(
                                                                            expanded
                                                                                ? null
                                                                                : row.registrationId,
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
                                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                                    <div>
                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                            Registration ID
                                                                        </p>
                                                                        <p className="mt-1 font-semibold text-ink-800">
                                                                            #
                                                                            {
                                                                                row.registrationId
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                            User
                                                                        </p>
                                                                        <p className="mt-1 font-medium text-ink-800">
                                                                            #
                                                                            {row.userId}
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                            Ticket state
                                                                        </p>
                                                                        <p className="mt-1 font-medium text-ink-800">
                                                                            {row.ticketIssued
                                                                                ? 'Ticket issued'
                                                                                : 'Ticket not issued'}
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                            Registered at
                                                                        </p>
                                                                        <p className="mt-1 font-medium text-ink-800">
                                                                            {formatDate(
                                                                                row.registeredAt,
                                                                                true,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                                                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                                                                    <p>
                                                                        The current organization
                                                                        API exposes registration
                                                                        data, but not the persisted
                                                                        ticket number, QR code or
                                                                        check-in record. Those values
                                                                        are intentionally not fabricated.
                                                                    </p>
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

                        <div className="divide-y divide-ink-100 lg:hidden">
                            {filteredRows.map(
                                (row) => {
                                    const expanded =
                                        expandedId ===
                                        row.registrationId;

                                    return (
                                        <div
                                            key={`${row.eventId}-${row.registrationId}`}
                                            className="p-4"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedId(
                                                        expanded
                                                            ? null
                                                            : row.registrationId,
                                                    )
                                                }
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                        <Ticket className="h-5 w-5" />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-semibold text-ink-900">
                                                                    {row.eventTitle}
                                                                </p>

                                                                <p className="mt-1 text-xs text-ink-500">
                                                                    {
                                                                        row.attendeeName
                                                                    }
                                                                </p>
                                                            </div>

                                                            {expanded ? (
                                                                <ChevronUp className="h-4 w-4 text-ink-400" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-ink-400" />
                                                            )}
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <Badge
                                                                tone={
                                                                    row.ticketIssued
                                                                        ? 'green'
                                                                        : 'orange'
                                                                }
                                                            >
                                                                {row.ticketIssued
                                                                    ? 'Issued'
                                                                    : 'Awaiting'}
                                                            </Badge>

                                                            <Badge
                                                                tone={getStatusTone(
                                                                    row.registrationStatus,
                                                                )}
                                                            >
                                                                {getStatusLabel(
                                                                    row.registrationStatus,
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            {expanded && (
                                                <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
                                                    <div>
                                                        <p className="text-xs text-ink-400">
                                                            Email
                                                        </p>

                                                        <p className="mt-1 text-sm font-medium text-ink-800">
                                                            {row.attendeeEmail}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs text-ink-400">
                                                            Registered
                                                        </p>

                                                        <p className="mt-1 text-sm font-medium text-ink-800">
                                                            {formatDate(
                                                                row.registeredAt,
                                                                true,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                                        Ticket number, QR and
                                                        check-in details are not
                                                        exposed by the current
                                                        organization ticket API.
                                                    </div>
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
                    This console is organization-scoped. Check-in
                    mutations remain outside the Admin console and
                    belong to Staff operations.
                </p>
            </div>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    hint,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    hint: string;
}) {
    return (
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {label}
                </span>

                <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                    {icon}
                </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-ink-900">
                {value}
            </p>

            <p className="mt-1 text-xs text-ink-400">
                {hint}
            </p>
        </div>
    );
}

function CircleDollarIcon(
    props: React.SVGProps<SVGSVGElement>,
) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10" />
            <path d="M15 9.5c0-1-1.1-1.5-3-1.5s-3 .5-3 2 1.1 2 3 2 3 .5 3 2-1.1 2-3 2-3-.5-3-1.5" />
        </svg>
    );
}
