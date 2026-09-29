import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    CalendarDays,
    Users,
    IndianRupee,
    Clock3,
    CheckCircle2,
    Radio,
    MapPin,
    Plus,
    Pencil,
    MoreHorizontal,
    Eye,
    XCircle,
    Trash2,
    Building2,
    RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { EventsAPI, OrgsAPI } from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { fmtDate } from '../../lib/utils';
import type { EventItem, Organization } from '../../lib/types';

type EventStatus = 'all' | 'published' | 'draft' | 'cancelled' | 'completed';
type TimeFilter = 'all' | 'upcoming' | 'live' | 'past';
type SortOption = 'date_asc' | 'date_desc' | 'registrations' | 'revenue';

function statusTone(status?: string) {
    switch (status?.toLowerCase()) {
        case 'published':
            return 'green' as const;
        case 'cancelled':
            return 'red' as const;
        case 'completed':
            return 'blue' as const;
        default:
            return 'gray' as const;
    }
}

export function EventsAdmin() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [q, setQ] = useState('');
    const [status, setStatus] = useState<EventStatus>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState<SortOption>('date_asc');
    const [openMenu, setOpenMenu] = useState<number | null>(null);

    const {
        data: organizations = [],
        isLoading: organizationsLoading,
        isError: organizationsError,
    } = useQuery<Organization[]>({
        queryKey: ['organizations', 'admin'],
        queryFn: () => OrgsAPI.list(),
        staleTime: 60_000,
    });

    const organization = organizations[0];
    const organizationId = organization?.id;

    const {
        data: events = [],
        isLoading: eventsLoading,
        isError: eventsError,
        refetch,
    } = useQuery<EventItem[]>({
        queryKey: ['events', 'admin', organizationId],
        queryFn: () => EventsAPI.listByOrganization(organizationId as number),
        enabled: Boolean(organizationId),
        staleTime: 30_000,
    });

    const publishMutation = useMutation({
        mutationFn: (id: number) => EventsAPI.publish(id),
        onSuccess: () => {
            toast.success('Event published');
            setOpenMenu(null);
            queryClient.invalidateQueries({
                queryKey: ['events', 'admin', organizationId],
            });
        },
        onError: () => toast.error('Failed to publish event'),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => EventsAPI.cancel(id),
        onSuccess: () => {
            toast.success('Event cancelled');
            setOpenMenu(null);
            queryClient.invalidateQueries({
                queryKey: ['events', 'admin', organizationId],
            });
        },
        onError: () => toast.error('Failed to cancel event'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => EventsAPI.remove(id),
        onSuccess: () => {
            toast.success('Event deleted');
            setOpenMenu(null);
            queryClient.invalidateQueries({
                queryKey: ['events', 'admin', organizationId],
            });
        },
        onError: () => toast.error('Failed to delete event'),
    });

    const getStartDate = (event: EventItem): Date | null => {
        if (!event.start_at) return null;
        const value = new Date(event.start_at);
        return Number.isNaN(value.getTime()) ? null : value;
    };

    const getEndDate = (event: EventItem): Date | null => {
        if (!event.end_at) return null;
        const value = new Date(event.end_at);
        return Number.isNaN(value.getTime()) ? null : value;
    };

    const getRegistered = (event: EventItem) =>
        Number(event.registered_count ?? 0) || 0;

    const getCapacity = (event: EventItem) =>
        Number(event.capacity ?? 0) || 0;

    const getPrice = (event: EventItem) =>
        Number(event.price ?? 0) || 0;

    const getRevenue = (event: EventItem) =>
        getPrice(event) * getRegistered(event);

    const getTimeState = (event: EventItem): TimeFilter => {
        const now = new Date();
        const start = getStartDate(event);
        const end = getEndDate(event);

        if (!start) return 'all';

        if (
            start <= now &&
            end &&
            end >= now &&
            event.status?.toLowerCase() === 'published'
        ) {
            return 'live';
        }

        if (start > now) return 'upcoming';
        if (start <= now) return 'past';

        return 'all';
    };

    const categories = useMemo(() => {
        const values = events
            .map((event) => event.category)
            .filter(Boolean)
            .map(String);

        return ['all', ...Array.from(new Set(values)).sort()];
    }, [events]);

    const filteredEvents = useMemo(() => {
        let list = [...events];
        const search = q.trim().toLowerCase();

        if (search) {
            list = list.filter((event) =>
                [
                    event.title,
                    event.venue,
                    event.city,
                    event.category,
                    event.slug,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(search),
            );
        }

        if (status !== 'all') {
            list = list.filter(
                (event) => event.status?.toLowerCase() === status,
            );
        }

        if (category !== 'all') {
            list = list.filter((event) => event.category === category);
        }

        if (timeFilter !== 'all') {
            list = list.filter((event) => getTimeState(event) === timeFilter);
        }

        list.sort((a, b) => {
            const dateA = getStartDate(a)?.getTime() ?? 0;
            const dateB = getStartDate(b)?.getTime() ?? 0;

            switch (sort) {
                case 'date_desc':
                    return dateB - dateA;
                case 'registrations':
                    return getRegistered(b) - getRegistered(a);
                case 'revenue':
                    return getRevenue(b) - getRevenue(a);
                default:
                    return dateA - dateB;
            }
        });

        return list;
    }, [events, q, status, category, timeFilter, sort]);

    const stats = useMemo(() => {
        const published = events.filter(
            (event) => event.status?.toLowerCase() === 'published',
        ).length;

        const drafts = events.filter(
            (event) => event.status?.toLowerCase() === 'draft',
        ).length;

        const upcoming = events.filter(
            (event) => getTimeState(event) === 'upcoming',
        ).length;

        const live = events.filter(
            (event) => getTimeState(event) === 'live',
        ).length;

        const registrations = events.reduce(
            (total, event) => total + getRegistered(event),
            0,
        );

        const revenue = events.reduce(
            (total, event) => total + getRevenue(event),
            0,
        );

        return {
            total: events.length,
            published,
            drafts,
            upcoming,
            live,
            registrations,
            revenue,
        };
    }, [events]);

    const handleDelete = (event: EventItem) => {
        const confirmed = window.confirm(
            `Delete "${event.title || 'this event'}"? This action cannot be undone.`,
        );

        if (!confirmed) return;

        deleteMutation.mutate(Number(event.id));
    };

    if (organizationsLoading || eventsLoading) {
        return (
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-36" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="rounded-2xl border border-ink-200 bg-white p-5"
                        >
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-3 h-8 w-20" />
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <Skeleton className="h-11 w-full" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-20 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (organizationsError || eventsError) {
        return (
            <div className="space-y-5">
                <div>
                    <h2 className="font-display text-2xl font-semibold text-ink-900">
                        Events
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Manage events for your organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <p className="font-semibold text-red-800">
                        Failed to load organization events
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                        Please refresh and try again.
                    </p>
                    <Button
                        className="mt-4"
                        variant="outline"
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
                        Events
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Manage events for your organization.
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-ink-300" />
                    <h3 className="mt-3 font-semibold text-ink-900">
                        No organization found
                    </h3>
                    <p className="mt-1 text-sm text-ink-500">
                        Create or join an organization before managing events.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-2xl font-semibold text-ink-900">
                            Events
                        </h2>
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                            {organization.name}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-ink-500">
                        Create, publish and manage your organization&apos;s events.
                    </p>
                </div>

                <Button onClick={() => navigate('/admin/events/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create event
                </Button>
            </div>

            {/* Important stats only */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Total events
                    </p>
                    <p className="mt-2 text-2xl font-bold text-ink-900">
                        {stats.total}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Published
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                        {stats.published}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                        <Clock3 className="h-4 w-4" />
                        Upcoming
                    </div>
                    <p className="mt-2 text-2xl font-bold text-sky-600">
                        {stats.upcoming}
                    </p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                        <Users className="h-4 w-4" />
                        Registrations
                    </div>
                    <p className="mt-2 text-2xl font-bold text-ink-900">
                        {stats.registrations}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-ink-200 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_180px_180px]">
                    <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
                        <Search className="h-4 w-4 shrink-0 text-ink-400" />
                        <input
                            value={q}
                            onChange={(event) => setQ(event.target.value)}
                            placeholder="Search events, venues..."
                            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as EventStatus)
                        }
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
                    >
                        <option value="all">All statuses</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                    </select>

                    <select
                        value={timeFilter}
                        onChange={(event) =>
                            setTimeFilter(event.target.value as TimeFilter)
                        }
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
                    >
                        <option value="all">All dates</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live now</option>
                        <option value="past">Past</option>
                    </select>

                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
                    >
                        {categories.map((item) => (
                            <option key={item} value={item}>
                                {item === 'all' ? 'All categories' : item}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sort}
                        onChange={(event) =>
                            setSort(event.target.value as SortOption)
                        }
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
                    >
                        <option value="date_asc">Earliest first</option>
                        <option value="date_desc">Latest first</option>
                        <option value="registrations">Most registrations</option>
                        <option value="revenue">Highest revenue</option>
                    </select>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
                    <p className="text-xs text-ink-500">
                        Showing{' '}
                        <span className="font-semibold text-ink-800">
                            {filteredEvents.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-ink-800">
                            {events.length}
                        </span>{' '}
                        events
                    </p>

                    {stats.live > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <Radio className="h-3.5 w-3.5" />
                            {stats.live} live now
                        </span>
                    )}
                </div>
            </div>

            {/* Event list */}
            {filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-ink-200 bg-white">
                    <EmptyState
                        title={events.length === 0 ? 'No events yet' : 'No matching events'}
                        description={
                            events.length === 0
                                ? 'Create your first event to start accepting registrations.'
                                : 'Try changing your search or filters.'
                        }
                    />
                    {events.length === 0 && (
                        <div className="flex justify-center pb-8">
                            <Button onClick={() => navigate('/admin/events/new')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create event
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                    {/* Desktop header */}
                    <div className="hidden grid-cols-[minmax(280px,2fr)_150px_130px_150px_120px_60px] border-b border-ink-200 bg-ink-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400 lg:grid">
                        <div>Event</div>
                        <div>When</div>
                        <div>Category</div>
                        <div>Registrations</div>
                        <div>Status</div>
                        <div />
                    </div>

                    {filteredEvents.map((event) => {
                        const registered = getRegistered(event);
                        const capacity = getCapacity(event);
                        const revenue = getRevenue(event);
                        const timeState = getTimeState(event);
                        const coverImage = event.cover_image
                            ? resolveMediaUrl(event.cover_image)
                            : '';

                        const registrationPercent =
                            capacity > 0
                                ? Math.min(100, (registered / capacity) * 100)
                                : 0;

                        const canPublish = event.status?.toLowerCase() === 'draft';
                        const canCancel = event.status?.toLowerCase() === 'published';

                        return (
                            <div
                                key={event.id}
                                className="relative border-b border-ink-100 last:border-b-0"
                            >
                                <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[minmax(280px,2fr)_150px_130px_150px_120px_60px] lg:items-center">
                                    {/* Event */}
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                                            {coverImage ? (
                                                <img
                                                    src={coverImage}
                                                    alt={event.title || 'Event cover'}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-brand-600">
                                                    <CalendarDays className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/admin/events/${event.id}/view`)}
                                                className="block max-w-full truncate text-left font-semibold text-ink-900 hover:text-brand-600"
                                            >
                                                {event.title || 'Untitled event'}
                                            </button>

                                            <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {event.venue || 'Venue not specified'}
                                                    {event.city ? `, ${event.city}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* When */}
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-ink-400">
                                            When
                                        </p>
                                        <p className="mt-1 font-medium text-ink-800">
                                            {event.start_at
                                                ? fmtDate(event.start_at, 'MMM d, yyyy')
                                                : '—'}
                                        </p>

                                        {timeState === 'live' && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                                <Radio className="h-3 w-3" />
                                                Live now
                                            </span>
                                        )}

                                        {timeState === 'upcoming' && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                                                <Clock3 className="h-3 w-3" />
                                                Upcoming
                                            </span>
                                        )}

                                        {timeState === 'past' && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-400">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Past
                                            </span>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-ink-400 lg:hidden">
                                            Category
                                        </p>
                                        <p className="font-medium text-ink-800">
                                            {event.category || '—'}
                                        </p>
                                    </div>

                                    {/* Registrations */}
                                    <div>
                                        <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-400">
                                            <Users className="h-3 w-3" />
                                            Reg / Cap
                                        </div>

                                        <p className="mt-1 font-semibold text-ink-900">
                                            {registered}
                                            {capacity > 0 ? ` / ${capacity}` : ''}
                                        </p>

                                        {capacity > 0 && (
                                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                                                <div
                                                    className="h-full rounded-full bg-brand-500"
                                                    style={{ width: `${registrationPercent}%` }}
                                                />
                                            </div>
                                        )}

                                        {revenue > 0 && (
                                            <p className="mt-1 text-[11px] text-ink-400">
                                                ₹
                                                {revenue.toLocaleString('en-IN', {
                                                    maximumFractionDigits: 0,
                                                })}{' '}
                                                revenue
                                            </p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <Badge tone={statusTone(event.status)}>
                                            {event.status || 'Unknown'}
                                        </Badge>
                                    </div>

                                    {/* Actions */}
                                    <div className="relative flex justify-start lg:justify-end">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenMenu(
                                                    openMenu === Number(event.id)
                                                        ? null
                                                        : Number(event.id),
                                                )
                                            }
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-800"
                                            aria-label="Event actions"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>

                                        {openMenu === Number(event.id) && (
                                            <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-ink-200 bg-white p-1.5 shadow-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/admin/events/${event.id}/view`)}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View event
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit event
                                                </button>

                                                {canPublish && (
                                                    <button
                                                        type="button"
                                                        disabled={publishMutation.isPending}
                                                        onClick={() =>
                                                            publishMutation.mutate(Number(event.id))
                                                        }
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Publish event
                                                    </button>
                                                )}

                                                {canCancel && (
                                                    <button
                                                        type="button"
                                                        disabled={cancelMutation.isPending}
                                                        onClick={() =>
                                                            cancelMutation.mutate(Number(event.id))
                                                        }
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Cancel event
                                                    </button>
                                                )}

                                                {event.status?.toLowerCase() !== 'published' && (
                                                    <button
                                                        type="button"
                                                        disabled={deleteMutation.isPending}
                                                        onClick={() => handleDelete(event)}
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete event
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default EventsAdmin;
