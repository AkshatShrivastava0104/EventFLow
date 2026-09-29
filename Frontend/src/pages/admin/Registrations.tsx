import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    Download,
    RefreshCw,
    Users,
    CheckCircle2,
    Clock3,
    XCircle,
    CreditCard,
    CalendarDays,
    Mail,
    ChevronDown,
    ChevronUp,
    Ticket,
    Building2,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { EventsAPI, OrgsAPI } from '../../lib/queries';
import api from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { fmtDate, fmtRelative } from '../../lib/utils';

type RegistrationRow = {
    registration_id: number;
    user_id: number;
    name: string;
    email: string;
    status: string;
    payment_status: string;
    created_at: string;
    event_id: number;
    event_title: string;
    event_start_at?: string | null;
    event_price: number;
};

type EventRegistrationResponse = {
    attendees?: unknown[];
    registrations?: unknown[];
    data?: unknown[];
    pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        total_pages?: number;
    };
};

type StatusFilter =
    | 'all'
    | 'registered'
    | 'pending'
    | 'cancelled'
    | 'waitlist';

type PaymentFilter =
    | 'all'
    | 'paid'
    | 'unpaid'
    | 'pending';

type SortOption =
    | 'newest'
    | 'oldest'
    | 'attendee_asc'
    | 'attendee_desc';

function normalizeRows(
    response: EventRegistrationResponse | unknown,
    event: any,
): RegistrationRow[] {
    let rawRows: unknown[] = [];

    if (Array.isArray(response)) {
        rawRows = response;
    } else if (response && typeof response === 'object') {
        const value = response as EventRegistrationResponse;

        if (Array.isArray(value.attendees)) {
            rawRows = value.attendees;
        } else if (Array.isArray(value.registrations)) {
            rawRows = value.registrations;
        } else if (Array.isArray(value.data)) {
            rawRows = value.data;
        }
    }

    return rawRows
        .map((item: any) => {
            const status = String(
                item?.status ?? 'pending',
            ).toLowerCase();

            const paymentStatus = String(
                item?.payment_status ??
                item?.payment?.status ??
                (Number(event?.price ?? 0) === 0
                    ? 'paid'
                    : 'unpaid'),
            ).toLowerCase();

            return {
                registration_id: Number(
                    item?.registration_id ?? item?.id ?? 0,
                ),
                user_id: Number(
                    item?.user_id ?? 0,
                ),
                name:
                    item?.name ??
                    item?.user_name ??
                    item?.attendee_name ??
                    'Unknown attendee',
                email:
                    item?.email ??
                    item?.user_email ??
                    item?.attendee_email ??
                    '—',
                status,
                payment_status: paymentStatus,
                created_at:
                    item?.created_at ??
                    item?.registered_at ??
                    item?.createdAt ??
                    '',
                event_id: Number(event?.id ?? 0),
                event_title:
                    event?.title ??
                    'Unknown event',
                event_start_at:
                    event?.start_at ??
                    event?.start_time ??
                    null,
                event_price: Number(
                    event?.price ?? 0,
                ),
            };
        })
        .filter(
            (row) => row.registration_id > 0,
        );
}

function statusTone(
    status: string,
): 'green' | 'orange' | 'red' | 'gray' {
    switch (status) {
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

function paymentTone(
    status: string,
): 'green' | 'orange' | 'red' | 'gray' {
    switch (status) {
        case 'paid':
            return 'green';

        case 'pending':
            return 'orange';

        case 'refunded':
            return 'red';

        default:
            return 'gray';
    }
}

function displayStatus(status: string) {
    switch (status) {
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

function displayPaymentStatus(status: string) {
    switch (status) {
        case 'paid':
            return 'Paid';

        case 'pending':
            return 'Pending';

        case 'unpaid':
            return 'Unpaid';

        case 'refunded':
            return 'Refunded';

        default:
            return status || 'Unknown';
    }
}

async function fetchEventRegistrations(
    event: any,
): Promise<RegistrationRow[]> {
    const response = await api.get(
        `/events/${event.id}/registrations`,
        {
            params: {
                page: 1,
                limit: 100,
            },
        },
    );

    return normalizeRows(
        response.data,
        event,
    );
}

export function Registrations() {
    const [search, setSearch] = useState('');
    const [eventId, setEventId] =
        useState<string>('all');
    const [status, setStatus] =
        useState<StatusFilter>('all');
    const [paymentStatus, setPaymentStatus] =
        useState<PaymentFilter>('all');
    const [sort, setSort] =
        useState<SortOption>('newest');
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
            'registrations',
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
            'organization-registrations',
            organization?.id,
            events.map((event: any) => event.id).join(','),
        ],
        queryFn: async () => {
            if (!events.length) {
                return [] as RegistrationRow[];
            }

            const responses = await Promise.all(
                events.map((event: any) =>
                    fetchEventRegistrations(event),
                ),
            );

            return responses.flat();
        },
        enabled:
            Boolean(organization?.id) &&
            events.length > 0,
        staleTime: 15_000,
    });

    const registrations = useMemo(
        () => registrationGroups,
        [registrationGroups],
    );

    const filtered = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();

        let rows = registrations.filter(
            (registration) => {
                if (
                    eventId !== 'all' &&
                    String(registration.event_id) !==
                    eventId
                ) {
                    return false;
                }

                if (
                    status !== 'all' &&
                    registration.status !== status
                ) {
                    return false;
                }

                if (
                    paymentStatus !== 'all' &&
                    registration.payment_status !==
                    paymentStatus
                ) {
                    return false;
                }

                if (query) {
                    const searchable = [
                        registration.name,
                        registration.email,
                        registration.event_title,
                        String(
                            registration.registration_id,
                        ),
                    ]
                        .join(' ')
                        .toLowerCase();

                    if (!searchable.includes(query)) {
                        return false;
                    }
                }

                return true;
            },
        );

        rows.sort((a, b) => {
            switch (sort) {
                case 'oldest':
                    return (
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    );

                case 'attendee_asc':
                    return a.name.localeCompare(
                        b.name,
                    );

                case 'attendee_desc':
                    return b.name.localeCompare(
                        a.name,
                    );

                default:
                    return (
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    );
            }
        });

        return rows;
    }, [
        registrations,
        search,
        eventId,
        status,
        paymentStatus,
        sort,
    ]);

    const metrics = useMemo(() => {
        const active = registrations.filter(
            (row) =>
                row.status === 'registered' ||
                row.status === 'confirmed',
        ).length;

        const pending = registrations.filter(
            (row) =>
                row.status === 'pending' ||
                row.status === 'waitlist' ||
                row.status === 'waitlisted',
        ).length;

        const cancelled = registrations.filter(
            (row) =>
                row.status === 'cancelled',
        ).length;

        const paid = registrations.filter(
            (row) =>
                row.payment_status === 'paid',
        ).length;

        return {
            total: registrations.length,
            active,
            pending,
            cancelled,
            paid,
        };
    }, [registrations]);

    const exportCSV = () => {
        if (!filtered.length) {
            toast.error(
                'There are no registrations to export.',
            );
            return;
        }

        const headers = [
            'Registration ID',
            'Attendee',
            'Email',
            'Event',
            'Event Date',
            'Registration Status',
            'Payment Status',
            'Registered At',
        ];

        const escapeCSV = (
            value: unknown,
        ) =>
            `"${String(value ?? '').replace(
                /"/g,
                '""',
            )}"`;

        const lines = [
            headers.map(escapeCSV).join(','),
        ];

        filtered.forEach((row) => {
            lines.push(
                [
                    row.registration_id,
                    row.name,
                    row.email,
                    row.event_title,
                    row.event_start_at ?? '',
                    row.status,
                    row.payment_status,
                    row.created_at,
                ]
                    .map(escapeCSV)
                    .join(','),
            );
        });

        const blob = new Blob(
            [lines.join('\n')],
            {
                type: 'text/csv;charset=utf-8;',
            },
        );

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement('a');

        anchor.href = url;
        anchor.download =
            `eventflow-registrations-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);

        toast.success(
            'Registration CSV exported.',
        );
    };

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
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="mt-2 h-4 w-80" />
                    </div>

                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {Array.from({
                        length: 5,
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
                        Registrations
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Manage registrations for your
                        organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                    <h3 className="mt-3 font-semibold text-red-900">
                        Unable to load registrations
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
                        Registrations
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Manage registrations for your
                        organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-ink-300" />

                    <h3 className="mt-3 font-semibold text-ink-900">
                        No organization found
                    </h3>

                    <p className="mt-1 text-sm text-ink-500">
                        Create or join an organization before
                        managing registrations.
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
                        Registrations
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm text-ink-500">
                        Track attendees, registration status and
                        payment status across your organization&apos;s
                        events.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
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

                    <Button
                        variant="secondary"
                        onClick={exportCSV}
                        disabled={!filtered.length}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Total
                        </span>
                        <Users className="h-4 w-4 text-brand-500" />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-ink-900">
                        {metrics.total}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        All registrations
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Active
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                        {metrics.active}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Registered attendees
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Pending
                        </span>
                        <Clock3 className="h-4 w-4 text-orange-500" />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-orange-600">
                        {metrics.pending}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Pending or waitlisted
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Cancelled
                        </span>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-red-600">
                        {metrics.cancelled}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Cancelled registrations
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Paid
                        </span>
                        <CreditCard className="h-4 w-4 text-sky-500" />
                    </div>

                    <p className="mt-2 text-2xl font-bold text-sky-600">
                        {metrics.paid}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                        Paid registrations
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_200px_200px_190px]">
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                        <Search className="h-4 w-4 shrink-0 text-ink-400" />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search attendee, email, event..."
                            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                        />
                    </div>

                    <select
                        value={eventId}
                        onChange={(event) =>
                            setEventId(event.target.value)
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400"
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
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value as StatusFilter,
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400"
                    >
                        <option value="all">
                            All registration statuses
                        </option>
                        <option value="registered">
                            Registered
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                        <option value="waitlist">
                            Waitlisted
                        </option>
                        <option value="cancelled">
                            Cancelled
                        </option>
                    </select>

                    <select
                        value={paymentStatus}
                        onChange={(event) =>
                            setPaymentStatus(
                                event.target.value as PaymentFilter,
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400"
                    >
                        <option value="all">
                            All payment statuses
                        </option>
                        <option value="paid">
                            Paid
                        </option>
                        <option value="unpaid">
                            Unpaid
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                    </select>

                    <select
                        value={sort}
                        onChange={(event) =>
                            setSort(
                                event.target.value as SortOption,
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400"
                    >
                        <option value="newest">
                            Newest first
                        </option>
                        <option value="oldest">
                            Oldest first
                        </option>
                        <option value="attendee_asc">
                            Attendee A–Z
                        </option>
                        <option value="attendee_desc">
                            Attendee Z–A
                        </option>
                    </select>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
                    <p className="text-xs text-ink-500">
                        Showing{' '}
                        <span className="font-semibold text-ink-800">
                            {filtered.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-ink-800">
                            {registrations.length}
                        </span>{' '}
                        registrations
                    </p>

                    <div className="flex items-center gap-2 text-xs text-ink-400">
                        <Ticket className="h-3.5 w-3.5" />
                        Ticket and check-in operations are
                        handled from Tickets.
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
                <div className="border-b border-ink-100 px-5 py-4">
                    <h3 className="font-semibold text-ink-900">
                        Registration activity
                    </h3>

                    <p className="mt-1 text-xs text-ink-500">
                        Attendee registrations across{' '}
                        {organization.name}.
                    </p>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-10">
                        <EmptyState
                            title={
                                registrations.length === 0
                                    ? 'No registrations yet'
                                    : 'No matching registrations'
                            }
                            description={
                                registrations.length === 0
                                    ? 'Registrations will appear here when attendees register for your events.'
                                    : 'Try changing your search or filters.'
                            }
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-ink-100 bg-ink-50">
                                <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                                    <th className="px-5 py-4">
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
                                    <th className="px-4 py-4">
                                        Details
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-ink-100">
                                {filtered.map((registration) => {
                                    const expanded =
                                        expandedId ===
                                        registration.registration_id;

                                    return (
                                        <tr
                                            key={`${registration.event_id}-${registration.registration_id}`}
                                            className="group"
                                        >
                                            <td
                                                colSpan={6}
                                                className="p-0"
                                            >
                                                <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(220px,1.5fr)_170px_150px_140px_90px] items-center">
                                                    <div className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                                                <Users className="h-4 w-4" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-ink-900">
                                                                    {registration.name}
                                                                </p>

                                                                <p className="mt-0.5 truncate text-xs text-ink-500">
                                                                    {registration.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="px-4 py-4">
                                                        <p className="truncate font-medium text-ink-800">
                                                            {registration.event_title}
                                                        </p>

                                                        {registration.event_start_at && (
                                                            <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                                                                <CalendarDays className="h-3 w-3" />
                                                                {fmtDate(
                                                                    registration.event_start_at,
                                                                    'MMM d, yyyy',
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="px-4 py-4">
                                                        <p className="font-medium text-ink-700">
                                                            {registration.created_at
                                                                ? fmtDate(
                                                                    registration.created_at,
                                                                    'MMM d, yyyy',
                                                                )
                                                                : '—'}
                                                        </p>

                                                        {registration.created_at && (
                                                            <p className="mt-0.5 text-xs text-ink-400">
                                                                {fmtRelative(
                                                                    registration.created_at,
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="px-4 py-4">
                                                        <Badge
                                                            tone={statusTone(
                                                                registration.status,
                                                            )}
                                                            dot
                                                        >
                                                            {displayStatus(
                                                                registration.status,
                                                            )}
                                                        </Badge>
                                                    </div>

                                                    <div className="px-4 py-4">
                                                        <Badge
                                                            tone={paymentTone(
                                                                registration.payment_status,
                                                            )}
                                                        >
                                                            {displayPaymentStatus(
                                                                registration.payment_status,
                                                            )}
                                                        </Badge>
                                                    </div>

                                                    <div className="px-4 py-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedId(
                                                                    expanded
                                                                        ? null
                                                                        : registration.registration_id,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                                                        >
                                                            {expanded ? (
                                                                <>
                                                                    Hide
                                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    View
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {expanded && (
                                                    <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-4">
                                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                    Registration ID
                                                                </p>
                                                                <p className="mt-1 font-semibold text-ink-800">
                                                                    #{registration.registration_id}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                    Attendee email
                                                                </p>
                                                                <a
                                                                    href={`mailto:${registration.email}`}
                                                                    className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-brand-600 hover:text-brand-700"
                                                                >
                                                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                                                    {registration.email}
                                                                </a>
                                                            </div>

                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                    Event
                                                                </p>
                                                                <p className="mt-1 font-medium text-ink-800">
                                                                    {registration.event_title}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                                                                    Payment
                                                                </p>
                                                                <p className="mt-1 font-medium text-ink-800">
                                                                    {displayPaymentStatus(
                                                                        registration.payment_status,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-3 text-xs text-ink-500">
                                                            <span>
                                                                Registered{' '}
                                                                {registration.created_at
                                                                    ? new Date(
                                                                        registration.created_at,
                                                                    ).toLocaleString(
                                                                        'en-IN',
                                                                        {
                                                                            dateStyle:
                                                                                'medium',
                                                                            timeStyle:
                                                                                'short',
                                                                        },
                                                                    )
                                                                    : '—'}
                                                            </span>

                                                            <span className="text-ink-300">
                                                                •
                                                            </span>

                                                            <span>
                                                                User ID #{registration.user_id}
                                                            </span>

                                                            <span className="text-ink-300">
                                                                •
                                                            </span>

                                                            <span>
                                                                Event ID #{registration.event_id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer note */}
            <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p>
                    Registration records are read from the event
                    registration API. Ticket generation and operational
                    check-in remain in the Tickets section.
                </p>
            </div>
        </div>
    );
}

export default Registrations;
