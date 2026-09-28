import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    Ticket,
    CheckCircle2,
    Clock3,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    UserRound,
    Mail,
    ScanLine,
} from 'lucide-react';

import { AdminAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

interface PlatformTicket {
    id: number;
    ticket_number: string;
    qr_code?: string;
    created_at: string;
}

interface PlatformCheckin {
    id: number;
    ticket_id: number;
    volunteer_id?: number | null;
    volunteer_name?: string;
    volunteer_email?: string;
    checked_in_at: string;
}

interface ActivityItem {
    type: string;
    label: string;
    occurred_at: string;
    description: string;
}

interface PlatformRegistration {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    event_id: number;
    event_title: string;
    organization_id: number;
    organization_name: string;
    registration_status: string;
    payment_status: string;
    registered_at: string;
    ticket?: PlatformTicket | null;
    checkin?: PlatformCheckin | null;
    activity?: ActivityItem[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

interface PlatformRegistrationsResponse {
    registrations?: PlatformRegistration[];
    pagination?: Pagination;
}

function formatDate(value?: string) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatShortDate(value?: string) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getStatusTone(
    status?: string,
): 'green' | 'yellow' | 'red' | 'gray' {
    switch (status?.toLowerCase()) {
        case 'registered':
        case 'paid':
        case 'checked_in':
            return 'green';

        case 'pending':
        case 'unpaid':
            return 'yellow';

        case 'cancelled':
        case 'failed':
            return 'red';

        default:
            return 'gray';
    }
}

export function PlatformTickets() {
    const [search, setSearch] = useState('');
    const [checkinFilter, setCheckinFilter] = useState<
        '' | 'checked_in' | 'not_checked_in'
    >('');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const limit = 20;

    const { data, isLoading, isError } = useQuery({
        queryKey: [
            'platform-tickets',
            search,
            checkinFilter,
            page,
        ],
        queryFn: () =>
            AdminAPI.listRegistrations({
                search: search.trim() || undefined,
                checkin: checkinFilter || undefined,
                page,
                limit,
                sort: 'newest',
            }),
    });

    const response =
        (data as PlatformRegistrationsResponse | undefined) ?? {};

    const registrations = response.registrations ?? [];

    const tickets = useMemo(
        () =>
            registrations.filter(
                (registration) => registration.ticket,
            ),
        [registrations],
    );

    const pagination = response.pagination ?? {
        page,
        limit,
        total: 0,
        total_pages: 0,
    };

    const checkedInCount = tickets.filter(
        (registration) => !!registration.checkin,
    ).length;

    const pendingCheckinCount =
        tickets.length - checkedInCount;

    const uniqueEvents = new Set(
        tickets.map((registration) => registration.event_id),
    ).size;

    const uniqueOrganizations = new Set(
        tickets.map(
            (registration) => registration.organization_id,
        ),
    ).size;

    const handleSearchChange = (
        value: string,
    ) => {
        setSearch(value);
        setPage(1);
        setExpandedId(null);
    };

    const handleCheckinFilterChange = (
        value: '' | 'checked_in' | 'not_checked_in',
    ) => {
        setCheckinFilter(value);
        setPage(1);
        setExpandedId(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Ticket className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="font-display text-2xl font-semibold text-ink-900">
                            Platform Tickets
                        </h2>

                        <p className="text-sm text-ink-500">
                            Monitor tickets issued across the entire
                            EventFlow platform.
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                Tickets
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {pagination.total}
                            </p>
                        </div>

                        <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                            <Ticket className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                Checked in
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {checkedInCount}
                            </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                Awaiting check-in
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {pendingCheckinCount}
                            </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                            <Clock3 className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                                Events
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {uniqueEvents}
                            </p>

                            <p className="mt-1 text-xs text-ink-400">
                                Across {uniqueOrganizations} organizations
                            </p>
                        </div>

                        <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3">
                        <Search className="h-4 w-4 shrink-0 text-ink-400" />

                        <input
                            value={search}
                            onChange={(event) =>
                                handleSearchChange(event.target.value)
                            }
                            placeholder="Search ticket, attendee, event or organization..."
                            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                        />
                    </div>

                    <select
                        value={checkinFilter}
                        onChange={(event) =>
                            handleCheckinFilterChange(
                                event.target.value as
                                | ''
                                | 'checked_in'
                                | 'not_checked_in',
                            )
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none"
                    >
                        <option value="">All check-in status</option>
                        <option value="checked_in">
                            Checked in
                        </option>
                        <option value="not_checked_in">
                            Awaiting check-in
                        </option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                {isError ? (
                    <div className="p-8">
                        <EmptyState
                            icon={
                                <Ticket className="h-5 w-5" />
                            }
                            title="Unable to load tickets"
                            description="There was a problem loading platform tickets. Try again."
                        />
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">
                                            Ticket
                                        </th>

                                        <th className="px-4 py-3">
                                            Attendee
                                        </th>

                                        <th className="px-4 py-3">
                                            Event
                                        </th>

                                        <th className="px-4 py-3">
                                            Organization
                                        </th>

                                        <th className="px-4 py-3">
                                            Issued
                                        </th>

                                        <th className="px-4 py-3">
                                            Check-in
                                        </th>

                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-ink-100">
                                    {isLoading
                                        ? Array.from({
                                            length: 8,
                                        }).map((_, index) => (
                                            <tr key={index}>
                                                <td
                                                    colSpan={7}
                                                    className="px-5 py-4"
                                                >
                                                    <Skeleton className="h-9" />
                                                </td>
                                            </tr>
                                        ))
                                        : tickets.length === 0
                                            ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="p-8"
                                                    >
                                                        <EmptyState
                                                            icon={
                                                                <Ticket className="h-5 w-5" />
                                                            }
                                                            title="No tickets found"
                                                            description="There are no platform tickets matching your filters."
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                            : tickets.map(
                                                (registration) => {
                                                    const ticket =
                                                        registration.ticket!;
                                                    const checkin =
                                                        registration.checkin;

                                                    const expanded =
                                                        expandedId ===
                                                        registration.id;

                                                    return (
                                                        <>
                                                            <tr
                                                                key={
                                                                    registration.id
                                                                }
                                                                className="hover:bg-ink-50"
                                                            >
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                                                            <Ticket className="h-4 w-4" />
                                                                        </div>

                                                                        <div>
                                                                            <p className="font-mono text-xs font-semibold text-ink-900">
                                                                                {
                                                                                    ticket.ticket_number
                                                                                }
                                                                            </p>

                                                                            <p className="mt-0.5 text-[11px] text-ink-400">
                                                                                ID #
                                                                                {
                                                                                    ticket.id
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100">
                                                                            <UserRound className="h-4 w-4 text-ink-500" />
                                                                        </div>

                                                                        <div className="min-w-0">
                                                                            <p className="truncate font-medium text-ink-900">
                                                                                {
                                                                                    registration.user_name
                                                                                }
                                                                            </p>

                                                                            <p className="max-w-[180px] truncate text-xs text-ink-500">
                                                                                {
                                                                                    registration.user_email
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />

                                                                        <div className="min-w-0">
                                                                            <p className="max-w-[180px] truncate font-medium text-ink-800">
                                                                                {
                                                                                    registration.event_title
                                                                                }
                                                                            </p>

                                                                            <p className="text-xs text-ink-400">
                                                                                Event #
                                                                                {
                                                                                    registration.event_id
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <Building2 className="h-4 w-4 shrink-0 text-ink-400" />

                                                                        <span className="max-w-[160px] truncate text-ink-700">
                                                                            {
                                                                                registration.organization_name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4 text-xs text-ink-500">
                                                                    {formatDate(
                                                                        ticket.created_at,
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <Badge
                                                                        tone={
                                                                            checkin
                                                                                ? 'green'
                                                                                : 'gray'
                                                                        }
                                                                        dot
                                                                    >
                                                                        {checkin
                                                                            ? 'Checked in'
                                                                            : 'Awaiting'}
                                                                    </Badge>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setExpandedId(
                                                                                expanded
                                                                                    ? null
                                                                                    : registration.id,
                                                                            )
                                                                        }
                                                                        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                                                                        aria-label={
                                                                            expanded
                                                                                ? 'Collapse'
                                                                                : 'View details'
                                                                        }
                                                                    >
                                                                        {expanded ? (
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {expanded && (
                                                                <tr
                                                                    key={`${registration.id}-details`}
                                                                >
                                                                    <td
                                                                        colSpan={7}
                                                                        className="bg-ink-50 px-5 py-5"
                                                                    >
                                                                        <TicketDetails
                                                                            registration={
                                                                                registration
                                                                            }
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </>
                                                    );
                                                },
                                            )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="divide-y divide-ink-100 lg:hidden">
                            {isLoading ? (
                                Array.from({
                                    length: 5,
                                }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="p-4"
                                    >
                                        <Skeleton className="h-24" />
                                    </div>
                                ))
                            ) : tickets.length === 0 ? (
                                <div className="p-8">
                                    <EmptyState
                                        icon={
                                            <Ticket className="h-5 w-5" />
                                        }
                                        title="No tickets found"
                                        description="There are no platform tickets matching your filters."
                                    />
                                </div>
                            ) : (
                                tickets.map((registration) => {
                                    const ticket =
                                        registration.ticket!;
                                    const checkin =
                                        registration.checkin;

                                    const expanded =
                                        expandedId ===
                                        registration.id;

                                    return (
                                        <div
                                            key={registration.id}
                                            className="p-4"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedId(
                                                        expanded
                                                            ? null
                                                            : registration.id,
                                                    )
                                                }
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-start gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                            <Ticket className="h-5 w-5" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-mono text-xs font-semibold text-ink-900">
                                                                {
                                                                    ticket.ticket_number
                                                                }
                                                            </p>

                                                            <p className="mt-1 truncate font-medium text-ink-900">
                                                                {
                                                                    registration.user_name
                                                                }
                                                            </p>

                                                            <p className="truncate text-xs text-ink-500">
                                                                {
                                                                    registration.event_title
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        tone={
                                                            checkin
                                                                ? 'green'
                                                                : 'gray'
                                                        }
                                                        dot
                                                    >
                                                        {checkin
                                                            ? 'Checked in'
                                                            : 'Awaiting'}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <p className="text-ink-400">
                                                            Organization
                                                        </p>

                                                        <p className="mt-1 truncate font-medium text-ink-700">
                                                            {
                                                                registration.organization_name
                                                            }
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-ink-400">
                                                            Issued
                                                        </p>

                                                        <p className="mt-1 font-medium text-ink-700">
                                                            {formatShortDate(
                                                                ticket.created_at,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>

                                            {expanded && (
                                                <div className="mt-4 rounded-xl bg-ink-50 p-4">
                                                    <TicketDetails
                                                        registration={
                                                            registration
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {!isLoading &&
                    !isError &&
                    pagination.total_pages > 1 && (
                        <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-ink-500">
                                Showing{' '}
                                {Math.min(
                                    (pagination.page - 1) *
                                    pagination.limit +
                                    1,
                                    pagination.total,
                                )}{' '}
                                –
                                {Math.min(
                                    pagination.page *
                                    pagination.limit,
                                    pagination.total,
                                )}{' '}
                                of {pagination.total} tickets
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        pagination.page <= 1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (current) =>
                                                Math.max(
                                                    1,
                                                    current - 1,
                                                ),
                                        )
                                    }
                                    className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                <span className="rounded-lg bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
                                    {pagination.page} /{' '}
                                    {pagination.total_pages}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        pagination.page >=
                                        pagination.total_pages
                                    }
                                    onClick={() =>
                                        setPage(
                                            (current) =>
                                                Math.min(
                                                    pagination.total_pages,
                                                    current + 1,
                                                ),
                                        )
                                    }
                                    className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}

function TicketDetails({
    registration,
}: {
    registration: PlatformRegistration;
}) {
    const ticket = registration.ticket;
    const checkin = registration.checkin;

    return (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            {/* Ticket information */}
            <div className="rounded-xl border border-ink-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-brand-600" />

                    <h3 className="text-sm font-semibold text-ink-900">
                        Ticket details
                    </h3>
                </div>

                <div className="space-y-3 text-sm">
                    <div>
                        <p className="text-xs text-ink-400">
                            Ticket number
                        </p>

                        <p className="mt-1 font-mono text-xs font-semibold text-ink-900">
                            {ticket?.ticket_number || '—'}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-ink-400">
                            Ticket ID
                        </p>

                        <p className="mt-1 text-ink-700">
                            {ticket?.id ?? '—'}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-ink-400">
                            Generated at
                        </p>

                        <p className="mt-1 text-ink-700">
                            {formatDate(ticket?.created_at)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-ink-400">
                            Payment
                        </p>

                        <div className="mt-1">
                            <Badge
                                tone={getStatusTone(
                                    registration.payment_status,
                                )}
                                dot
                            >
                                {registration.payment_status ||
                                    'Unknown'}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-ink-400">
                            Registration
                        </p>

                        <div className="mt-1">
                            <Badge
                                tone={getStatusTone(
                                    registration.registration_status,
                                )}
                                dot
                            >
                                {registration.registration_status ||
                                    'Unknown'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Check-in information */}
            <div className="rounded-xl border border-ink-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-emerald-600" />

                    <h3 className="text-sm font-semibold text-ink-900">
                        Check-in details
                    </h3>
                </div>

                {checkin ? (
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-xs text-ink-400">
                                Checked in at
                            </p>

                            <p className="mt-1 font-medium text-ink-800">
                                {formatDate(
                                    checkin.checked_in_at,
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-ink-400">
                                Checked in by
                            </p>

                            <p className="mt-1 font-medium text-ink-800">
                                {checkin.volunteer_name ||
                                    checkin.volunteer_email ||
                                    'Staff member'}
                            </p>

                            {checkin.volunteer_email && (
                                <p className="mt-0.5 text-xs text-ink-500">
                                    {checkin.volunteer_email}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl bg-ink-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
                            <Clock3 className="h-4 w-4 text-ink-400" />
                            Awaiting check-in
                        </div>

                        <p className="mt-1 text-xs text-ink-500">
                            This ticket has not been scanned yet.
                        </p>
                    </div>
                )}
            </div>

            {/* Attendee + event */}
            <div className="rounded-xl border border-ink-200 bg-white p-4 xl:col-span-2">
                <div className="grid gap-5 md:grid-cols-3">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-ink-400" />

                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Attendee
                            </p>
                        </div>

                        <p className="font-medium text-ink-900">
                            {registration.user_name}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                            <Mail className="h-3.5 w-3.5" />
                            {registration.user_email}
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-ink-400" />

                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Event
                            </p>
                        </div>

                        <p className="font-medium text-ink-900">
                            {registration.event_title}
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                            Event #{registration.event_id}
                        </p>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-ink-400" />

                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                Organization
                            </p>
                        </div>

                        <p className="font-medium text-ink-900">
                            {registration.organization_name}
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                            Organization #
                            {registration.organization_id}
                        </p>
                    </div>
                </div>
            </div>

            {/* Activity */}
            {registration.activity &&
                registration.activity.length > 0 && (
                    <div className="rounded-xl border border-ink-200 bg-white p-4 xl:col-span-2">
                        <div className="mb-4 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-ink-500" />

                            <h3 className="text-sm font-semibold text-ink-900">
                                Ticket activity
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {registration.activity.map(
                                (item, index) => (
                                    <div
                                        key={`${item.type}-${index}`}
                                        className="flex gap-3"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" />

                                            {index <
                                                registration.activity!.length -
                                                1 && (
                                                    <div className="mt-1 w-px flex-1 bg-ink-200" />
                                                )}
                                        </div>

                                        <div className="pb-1">
                                            <p className="text-sm font-medium text-ink-800">
                                                {item.label}
                                            </p>

                                            <p className="mt-0.5 text-xs text-ink-500">
                                                {item.description}
                                            </p>

                                            <p className="mt-1 text-[11px] text-ink-400">
                                                {formatDate(
                                                    item.occurred_at,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
}

export default PlatformTickets;