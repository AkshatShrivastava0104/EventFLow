import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    ChevronDown,
    ChevronRight,
    Clock3,
    Filter,
    Search,
    UserRound,
    X,
} from 'lucide-react';

import { AuditLogsAPI } from '../../lib/queries';

interface AuditLog {
    id: number;
    user_id?: number | null;
    user_name?: string;
    user_email?: string;
    user_role?: string;
    action: string;
    entity: string;
    entity_id: string;
    ip_address?: string | null;
    created_at: string;
}

interface AuditLogsResponse {
    logs?: AuditLog[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

const PAGE_SIZE = 25;

function formatDateTime(value?: string) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function formatAction(action?: string) {
    if (!action) return 'Unknown';

    return action
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEntity(entity?: string) {
    if (!entity) return 'Unknown';

    return entity
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionClasses(action?: string) {
    const normalized = action?.toLowerCase() ?? '';

    if (
        normalized.includes('delete') ||
        normalized.includes('remove') ||
        normalized.includes('cancel')
    ) {
        return 'bg-red-50 text-red-700 border-red-100';
    }

    if (
        normalized.includes('create') ||
        normalized.includes('register') ||
        normalized.includes('publish') ||
        normalized.includes('add')
    ) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }

    if (
        normalized.includes('update') ||
        normalized.includes('edit') ||
        normalized.includes('change')
    ) {
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }

    if (
        normalized.includes('login') ||
        normalized.includes('logout') ||
        normalized.includes('auth')
    ) {
        return 'bg-violet-50 text-violet-700 border-violet-100';
    }

    return 'bg-ink-50 text-ink-700 border-ink-100';
}

function getRoleClasses(role?: string) {
    const normalized = role?.toLowerCase() ?? '';

    if (normalized === 'platform_owner' || normalized === 'owner') {
        return 'bg-violet-50 text-violet-700';
    }

    if (normalized === 'admin') {
        return 'bg-blue-50 text-blue-700';
    }

    if (normalized === 'staff') {
        return 'bg-emerald-50 text-emerald-700';
    }

    return 'bg-ink-50 text-ink-700';
}

export function ActivityLogs() {
    const [search, setSearch] = useState('');
    const [action, setAction] = useState('');
    const [entity, setEntity] = useState('');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const query = useQuery<AuditLogsResponse>({
        queryKey: ['audit-logs', search, action, entity, page],
        queryFn: () =>
            AuditLogsAPI.list({
                search: search.trim() || undefined,
                action: action || undefined,
                entity: entity || undefined,
                page,
                limit: PAGE_SIZE,
            }),
        placeholderData: (previousData) => previousData,
    });

    const logs = query.data?.logs ?? [];
    const pagination = query.data?.pagination;

    const total = pagination?.total ?? 0;
    const totalPages = Math.max(pagination?.total_pages ?? 1, 1);

    const activeFilters = useMemo(
        () => Boolean(search.trim() || action || entity),
        [search, action, entity],
    );

    const clearFilters = () => {
        setSearch('');
        setAction('');
        setEntity('');
        setPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleActionChange = (value: string) => {
        setAction(value);
        setPage(1);
    };

    const handleEntityChange = (value: string) => {
        setEntity(value);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                            <Activity className="h-5 w-5 text-violet-600" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-semibold text-ink-950">
                                Activity Logs
                            </h1>
                            <p className="mt-1 text-sm text-ink-500">
                                Platform activity and audit history
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
                    <Activity className="h-4 w-4 text-ink-400" />
                    <div>
                        <p className="text-xs text-ink-500">Total activities</p>
                        <p className="text-lg font-semibold text-ink-900">
                            {query.isLoading ? '—' : total.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                            value={search}
                            onChange={(event) =>
                                handleSearchChange(event.target.value)
                            }
                            placeholder="Search user, email, action, entity or ID..."
                            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                            <select
                                value={action}
                                onChange={(event) =>
                                    handleActionChange(event.target.value)
                                }
                                className="h-11 w-full min-w-[170px] appearance-none rounded-xl border border-ink-200 bg-white px-4 pr-9 text-sm text-ink-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            >
                                <option value="">All actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="remove">Remove</option>
                                <option value="publish">Publish</option>
                                <option value="cancel">Cancel</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        </div>

                        <div className="relative">
                            <select
                                value={entity}
                                onChange={(event) =>
                                    handleEntityChange(event.target.value)
                                }
                                className="h-11 w-full min-w-[170px] appearance-none rounded-xl border border-ink-200 bg-white px-4 pr-9 text-sm text-ink-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            >
                                <option value="">All entities</option>
                                <option value="organization">Organization</option>
                                <option value="event">Event</option>
                                <option value="registration">Registration</option>
                                <option value="ticket">Ticket</option>
                                <option value="user">User</option>
                                <option value="waitlist">Waitlist</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        </div>

                        {activeFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
                            >
                                <X className="h-4 w-4" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                    <Filter className="h-3.5 w-3.5" />
                    <span>
                        {activeFilters
                            ? 'Filters are applied to the platform audit log.'
                            : 'Showing the latest platform audit activity.'}
                    </span>
                </div>
            </div>

            {/* Error */}
            {query.isError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
                    Failed to load activity logs. Please try again.
                </div>
            )}

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b border-ink-100 bg-ink-50/60">
                            <tr>
                                <th className="w-10 px-4 py-3" />
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                                    Activity
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                                    Actor
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                                    Entity
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                                    Time
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-ink-100">
                            {query.isLoading ? (
                                Array.from({ length: 8 }).map((_, index) => (
                                    <tr key={index}>
                                        <td colSpan={5} className="px-4 py-5">
                                            <div className="h-5 animate-pulse rounded bg-ink-100" />
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-14 text-center">
                                        <Activity className="mx-auto h-8 w-8 text-ink-300" />
                                        <p className="mt-3 text-sm font-medium text-ink-700">
                                            No activity logs found
                                        </p>
                                        <p className="mt-1 text-xs text-ink-500">
                                            Try changing your filters.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const expanded = expandedId === log.id;

                                    return (
                                        <tr
                                            key={log.id}
                                            className="group align-top transition hover:bg-ink-50/40"
                                        >
                                            <td className="px-4 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedId(
                                                            expanded ? null : log.id,
                                                        )
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                                                    aria-label={
                                                        expanded
                                                            ? 'Collapse activity'
                                                            : 'Expand activity'
                                                    }
                                                >
                                                    {expanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${getActionClasses(
                                                            log.action,
                                                        )}`}
                                                    >
                                                        {formatAction(log.action)}
                                                    </span>

                                                    <span className="text-sm font-medium text-ink-900">
                                                        {formatEntity(log.entity)}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs text-ink-500">
                                                    Entity ID: {log.entity_id || '—'}
                                                </p>

                                                {expanded && (
                                                    <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <Detail
                                                                label="Log ID"
                                                                value={String(log.id)}
                                                            />
                                                            <Detail
                                                                label="Entity ID"
                                                                value={log.entity_id || '—'}
                                                            />
                                                            <Detail
                                                                label="IP address"
                                                                value={log.ip_address || '—'}
                                                            />
                                                            <Detail
                                                                label="Created at"
                                                                value={formatDateTime(log.created_at)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100">
                                                        <UserRound className="h-4 w-4 text-ink-500" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-ink-900">
                                                            {log.user_name || 'System / Unknown'}
                                                        </p>

                                                        {log.user_email && (
                                                            <p className="truncate text-xs text-ink-500">
                                                                {log.user_email}
                                                            </p>
                                                        )}

                                                        {log.user_role && (
                                                            <span
                                                                className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRoleClasses(
                                                                    log.user_role,
                                                                )}`}
                                                            >
                                                                {log.user_role.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <span className="text-sm text-ink-700">
                                                    {formatEntity(log.entity)}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4">
                                                <div className="flex items-center gap-2 text-sm text-ink-700">
                                                    <Clock3 className="h-4 w-4 text-ink-400" />
                                                    {formatDateTime(log.created_at)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                />
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 lg:hidden">
                {query.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-32 animate-pulse rounded-2xl bg-ink-100"
                        />
                    ))
                ) : logs.length === 0 ? (
                    <div className="rounded-2xl border border-ink-100 bg-white px-5 py-12 text-center shadow-sm">
                        <Activity className="mx-auto h-8 w-8 text-ink-300" />
                        <p className="mt-3 text-sm font-medium text-ink-700">
                            No activity logs found
                        </p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const expanded = expandedId === log.id;

                        return (
                            <div
                                key={log.id}
                                className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedId(
                                            expanded ? null : log.id,
                                        )
                                    }
                                    className="w-full text-left"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${getActionClasses(
                                                        log.action,
                                                    )}`}
                                                >
                                                    {formatAction(log.action)}
                                                </span>

                                                <span className="text-sm font-semibold text-ink-900">
                                                    {formatEntity(log.entity)}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs text-ink-500">
                                                Entity ID: {log.entity_id || '—'}
                                            </p>
                                        </div>

                                        {expanded ? (
                                            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                                        ) : (
                                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100">
                                            <UserRound className="h-4 w-4 text-ink-500" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-900">
                                                {log.user_name || 'System / Unknown'}
                                            </p>
                                            <p className="truncate text-xs text-ink-500">
                                                {log.user_email || 'No email available'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {formatDateTime(log.created_at)}
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="mt-4 border-t border-ink-100 pt-4">
                                        <div className="grid gap-3">
                                            <Detail
                                                label="Log ID"
                                                value={String(log.id)}
                                            />
                                            <Detail
                                                label="Entity ID"
                                                value={log.entity_id || '—'}
                                            />
                                            <Detail
                                                label="IP address"
                                                value={log.ip_address || '—'}
                                            />
                                            <Detail
                                                label="Created at"
                                                value={formatDateTime(log.created_at)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {!query.isLoading && logs.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                {label}
            </p>
            <p className="mt-1 break-words text-sm text-ink-800">
                {value}
            </p>
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    total,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    if (total === 0) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-ink-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500">
                Page {page} of {totalPages} · {total.toLocaleString('en-IN')} activities
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                        onPageChange(Math.max(1, page - 1))
                    }
                    className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>

                <span className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white">
                    {page}
                </span>

                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                        onPageChange(Math.min(totalPages, page + 1))
                    }
                    className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default ActivityLogs;
