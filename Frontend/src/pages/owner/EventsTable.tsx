import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  CalendarDays,
  Users,
  IndianRupee,
  Building2,
  Clock3,
  CheckCircle2,
  Radio,
  ChevronDown,
  ChevronRight,
  MapPin,
} from 'lucide-react';

import { EventsAPI } from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { fmtDate } from '../../lib/utils';
import type { EventItem } from '../../lib/types';

type EventStatus =
  | 'all'
  | 'published'
  | 'draft'
  | 'cancelled'
  | 'completed';

type TimeFilter =
  | 'all'
  | 'upcoming'
  | 'live'
  | 'past';

type SortOption =
  | 'date_asc'
  | 'date_desc'
  | 'registrations'
  | 'revenue';

type OrganizationGroup = {
  key: string;
  name: string;
  events: EventItem[];
};

export function EventsTable() {
  const [q, setQ] = useState('');
  const [status, setStatus] =
    useState<EventStatus>('all');

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>('all');

  const [category, setCategory] =
    useState('all');

  const [organization, setOrganization] =
    useState('all');

  const [sort, setSort] =
    useState<SortOption>('date_asc');

  const [
    expandedOrganizations,
    setExpandedOrganizations,
  ] = useState<Record<string, boolean>>({});

  /*
   * =========================================================
   * FETCH EVENTS
   * =========================================================
   */

  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => EventsAPI.list(),
  });

  /*
   * =========================================================
   * HELPERS
   * =========================================================
   */

  const getOrganizationName = (
    event: EventItem,
  ): string => {
    return (
      event.organizer_name?.trim() ||
      'Organization'
    );
  };

  const getOrganizationKey = (
    event: EventItem,
  ): string => {
    if (event.org_id !== null) {
      return String(event.org_id);
    }

    return `organization-${getOrganizationName(
      event,
    )}`;
  };

  const getStartDate = (
    event: EventItem,
  ): Date | null => {
    if (!event.start_at) {
      return null;
    }

    const value = new Date(event.start_at);

    return Number.isNaN(value.getTime())
      ? null
      : value;
  };

  const getEndDate = (
    event: EventItem,
  ): Date | null => {
    if (!event.end_at) {
      return null;
    }

    const value = new Date(event.end_at);

    return Number.isNaN(value.getTime())
      ? null
      : value;
  };

  const getRegistered = (
    event: EventItem,
  ): number => {
    return Number(event.registered_count ?? 0) || 0;
  };

  const getCapacity = (
    event: EventItem,
  ): number => {
    return Number(event.capacity ?? 0) || 0;
  };

  const getPrice = (
    event: EventItem,
  ): number => {
    return Number(event.price ?? 0) || 0;
  };

  const getRevenue = (
    event: EventItem,
  ): number => {
    return (
      getPrice(event) *
      getRegistered(event)
    );
  };

  const getTimeState = (
    event: EventItem,
  ): Exclude<TimeFilter, 'all'> | 'all' => {
    const now = new Date();

    const start = getStartDate(event);
    const end = getEndDate(event);

    if (!start) {
      return 'all';
    }

    if (
      start <= now &&
      end &&
      end >= now &&
      event.status === 'published'
    ) {
      return 'live';
    }

    if (start > now) {
      return 'upcoming';
    }

    if (start <= now) {
      return 'past';
    }

    return 'all';
  };

  /*
   * =========================================================
   * CATEGORIES
   * =========================================================
   */

  const categories = useMemo(() => {
    const values = events
      .map((event) => event.category)
      .filter(Boolean)
      .map((value) => String(value));

    return [
      'all',
      ...Array.from(new Set(values)).sort(),
    ];
  }, [events]);

  /*
   * =========================================================
   * ORGANIZATIONS
   * =========================================================
   */

  const organizations = useMemo(() => {
    const map = new Map<string, string>();

    events.forEach((event) => {
      map.set(
        getOrganizationKey(event),
        getOrganizationName(event),
      );
    });

    return [
      {
        key: 'all',
        name: 'All organizations',
      },
      ...Array.from(map.entries())
        .sort((a, b) =>
          a[1].localeCompare(b[1]),
        )
        .map(([key, name]) => ({
          key,
          name,
        })),
    ];
  }, [events]);

  /*
   * =========================================================
   * FILTER + SORT
   * =========================================================
   */

  const filteredEvents = useMemo(() => {
    let list = [...events];

    const search = q.trim().toLowerCase();

    if (search) {
      list = list.filter((event) => {
        const searchable = [
          event.title,
          event.venue,
          event.city,
          event.category,
          event.organizer_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(search);
      });
    }

    if (status !== 'all') {
      list = list.filter(
        (event) =>
          event.status.toLowerCase() ===
          status,
      );
    }

    if (category !== 'all') {
      list = list.filter(
        (event) =>
          event.category === category,
      );
    }

    if (organization !== 'all') {
      list = list.filter(
        (event) =>
          getOrganizationKey(event) ===
          organization,
      );
    }

    if (timeFilter !== 'all') {
      list = list.filter(
        (event) =>
          getTimeState(event) ===
          timeFilter,
      );
    }

    list.sort((a, b) => {
      const dateA =
        getStartDate(a)?.getTime() ?? 0;

      const dateB =
        getStartDate(b)?.getTime() ?? 0;

      switch (sort) {
        case 'date_desc':
          return dateB - dateA;

        case 'registrations':
          return (
            getRegistered(b) -
            getRegistered(a)
          );

        case 'revenue':
          return (
            getRevenue(b) -
            getRevenue(a)
          );

        case 'date_asc':
        default:
          return dateA - dateB;
      }
    });

    return list;
  }, [
    events,
    q,
    status,
    timeFilter,
    category,
    organization,
    sort,
  ]);

  /*
   * =========================================================
   * ORGANIZATION GROUPING
   * =========================================================
   */

  const organizationGroups =
    useMemo<OrganizationGroup[]>(() => {
      const map = new Map<
        string,
        OrganizationGroup
      >();

      filteredEvents.forEach((event) => {
        const key =
          getOrganizationKey(event);

        const name =
          getOrganizationName(event);

        if (!map.has(key)) {
          map.set(key, {
            key,
            name,
            events: [],
          });
        }

        map.get(key)!.events.push(event);
      });

      return Array.from(
        map.values(),
      ).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [filteredEvents]);

  /*
   * =========================================================
   * PLATFORM STATS
   * =========================================================
   */

  const stats = useMemo(() => {
    const now = new Date();

    const published = events.filter(
      (event) =>
        event.status === 'published',
    ).length;

    const upcoming = events.filter(
      (event) => {
        const start =
          getStartDate(event);

        return (
          start !== null &&
          start > now
        );
      },
    ).length;

    const live = events.filter(
      (event) =>
        getTimeState(event) === 'live',
    ).length;

    const completed = events.filter(
      (event) =>
        event.status === 'completed',
    ).length;

    const registrations =
      events.reduce(
        (total, event) =>
          total +
          getRegistered(event),
        0,
      );

    const revenue = events.reduce(
      (total, event) =>
        total +
        getRevenue(event),
      0,
    );

    const organizationCount =
      new Set(
        events.map((event) =>
          getOrganizationKey(event),
        ),
      ).size;

    return {
      total: events.length,
      published,
      upcoming,
      live,
      completed,
      registrations,
      revenue,
      organizationCount,
    };
  }, [events]);

  /*
   * =========================================================
   * TOGGLE ORGANIZATION
   * =========================================================
   */

  const toggleOrganization = (
    key: string,
  ) => {
    setExpandedOrganizations(
      (current) => ({
        ...current,
        [key]:
          !(current[key] ?? true),
      }),
    );
  };

  /*
   * =========================================================
   * EVENT ROW
   * =========================================================
   */

  const renderEvent = (
    event: EventItem,
  ) => {
    const price =
      getPrice(event);

    const registered =
      getRegistered(event);

    const capacity =
      getCapacity(event);

    const revenue =
      getRevenue(event);

    const coverImage =
      event.cover_image || '';

    const imageURL = coverImage
      ? resolveMediaUrl(coverImage)
      : '';

    const timeState =
      getTimeState(event);

    const registrationPercent =
      capacity > 0
        ? Math.min(
            100,
            (registered /
              capacity) *
              100,
          )
        : 0;

    return (
      <div
        key={event.id}
        className="border-t border-ink-100 bg-white transition-colors hover:bg-ink-50/60"
      >
        <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[minmax(260px,2fr)_150px_130px_150px_130px_110px] lg:items-center">

          {/* Event */}

          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-500 to-sky-500">
              {imageURL && (
                <img
                  src={imageURL}
                  alt={
                    event.title ||
                    'Event cover'
                  }
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display =
                      'none';
                  }}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate font-semibold text-ink-900">
                {event.title ||
                  'Untitled event'}
              </div>

              <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                <MapPin className="h-3 w-3 shrink-0" />

                <span className="truncate">
                  {event.venue ||
                    'Venue not specified'}

                  {event.city
                    ? `, ${event.city}`
                    : ''}
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
                ? fmtDate(
                    event.start_at,
                    'MMM d, yyyy',
                  )
                : '—'}
            </p>

            {timeState === 'live' && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Radio className="h-3 w-3" />
                Live now
              </span>
            )}

            {timeState ===
              'upcoming' && (
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
            <p className="text-xs uppercase tracking-wide text-ink-400">
              Category
            </p>

            <p className="mt-1 font-medium text-ink-800">
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

              {capacity > 0
                ? ` / ${capacity}`
                : ''}
            </p>

            {capacity > 0 && (
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{
                    width: `${registrationPercent}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Revenue */}

          <div>
            <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-400">
              <IndianRupee className="h-3 w-3" />
              Revenue
            </div>

            <p className="mt-1 font-semibold text-ink-900">
              ₹
              {revenue.toLocaleString(
                'en-IN',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </p>

            <p className="text-[11px] text-ink-400">
              {price > 0
                ? `₹${price.toLocaleString(
                    'en-IN',
                  )} / ticket`
                : 'Free event'}
            </p>
          </div>

          {/* Status */}

          <div>
            {event.status ===
              'published' && (
              <Badge tone="green">
                Published
              </Badge>
            )}

            {event.status === 'draft' && (
              <Badge tone="gray">
                Draft
              </Badge>
            )}

            {event.status ===
              'cancelled' && (
              <Badge tone="red">
                Cancelled
              </Badge>
            )}

            {event.status ===
              'completed' && (
              <Badge tone="blue">
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            All Events
          </h2>

          <p className="text-sm text-ink-500">
            Monitor events across all
            EventFlow organizations.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-ink-200 bg-white p-5"
            >
              <Skeleton className="h-4 w-24" />

              <div className="mt-3">
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <Skeleton className="h-12 w-full" />

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

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            All Events
          </h2>

          <p className="text-sm text-ink-500">
            Monitor events across all
            EventFlow organizations.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-800">
            Failed to load events
          </p>

          <p className="mt-1 text-sm text-red-600">
            Please refresh the page and try
            again.
          </p>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * NO EVENTS
   * =========================================================
   */

  if (events.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            All Events
          </h2>

          <p className="text-sm text-ink-500">
            Monitor events across all
            EventFlow organizations.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white">
          <EmptyState
            title="No events found"
            description="There are currently no events available across the platform."
          />
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * MAIN
   * =========================================================
   */

  return (
    <div className="space-y-5">

      {/* Header */}

      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            All Events
          </h2>

          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
            Read only
          </span>
        </div>

        <p className="mt-1 text-sm text-ink-500">
          Monitor events across all
          EventFlow organizations.
        </p>
      </div>

      {/* Stats */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            <Building2 className="h-4 w-4" />
            Organizations
          </div>

          <p className="mt-2 text-2xl font-bold text-ink-900">
            {stats.organizationCount}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            <CalendarDays className="h-4 w-4" />
            Total Events
          </div>

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

        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            <IndianRupee className="h-4 w-4" />
            Revenue
          </div>

          <p className="mt-2 text-xl font-bold text-ink-900">
            ₹
            {stats.revenue.toLocaleString(
              'en-IN',
              {
                maximumFractionDigits: 0,
              },
            )}
          </p>
        </div>

      </div>

      {/* Filters */}

      <div className="rounded-2xl border border-ink-200 bg-white p-3">
        <div className="flex flex-col gap-3 xl:flex-row">

          {/* Search */}

          <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3">
            <Search className="h-4 w-4 text-ink-400" />

            <input
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
              placeholder="Search events, organizations, venues..."
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          {/* Status */}

          <select
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as EventStatus,
              )
            }
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
          >
            <option value="all">
              All statuses
            </option>

            <option value="published">
              Published
            </option>

            <option value="draft">
              Draft
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="completed">
              Completed
            </option>
          </select>

          {/* Time */}

          <select
            value={timeFilter}
            onChange={(e) =>
              setTimeFilter(
                e.target.value as TimeFilter,
              )
            }
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
          >
            <option value="all">
              All time
            </option>

            <option value="upcoming">
              Upcoming
            </option>

            <option value="live">
              Live now
            </option>

            <option value="past">
              Past
            </option>
          </select>

          {/* Organization */}

          <select
            value={organization}
            onChange={(e) =>
              setOrganization(
                e.target.value,
              )
            }
            className="h-10 max-w-56 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
          >
            {organizations.map(
              (item) => (
                <option
                  key={item.key}
                  value={item.key}
                >
                  {item.name}
                </option>
              ),
            )}
          </select>

          {/* Category */}

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
          >
            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === 'all'
                    ? 'All categories'
                    : item}
                </option>
              ),
            )}
          </select>

          {/* Sort */}

          <select
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value as SortOption,
              )
            }
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-500"
          >
            <option value="date_asc">
              Date: earliest
            </option>

            <option value="date_desc">
              Date: latest
            </option>

            <option value="registrations">
              Most registrations
            </option>

            <option value="revenue">
              Highest revenue
            </option>
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
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

          <p className="text-xs text-ink-400">
            Owner access is read-only
          </p>
        </div>
      </div>

      {/* Organizations */}

      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white">
          <EmptyState
            title="No matching events"
            description="Try changing your search or filters."
          />
        </div>
      ) : (
        <div className="space-y-4">

          {organizationGroups.map(
            (group) => {
              const isExpanded =
                expandedOrganizations[
                  group.key
                ] ?? true;

              const groupRegistrations =
                group.events.reduce(
                  (total, event) =>
                    total +
                    getRegistered(event),
                  0,
                );

              const groupRevenue =
                group.events.reduce(
                  (total, event) =>
                    total +
                    getRevenue(event),
                  0,
                );

              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-2xl border border-ink-200 bg-white"
                >

                  {/* Organization Header */}

                  <button
                    type="button"
                    onClick={() =>
                      toggleOrganization(
                        group.key,
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left transition-colors hover:bg-ink-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="flex min-w-0 items-center gap-2">

                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-ink-900">
                            {group.name}
                          </h3>

                          <p className="mt-0.5 text-xs text-ink-500">
                            {group.events.length}{' '}
                            {group.events.length ===
                            1
                              ? 'event'
                              : 'events'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden items-center gap-8 sm:flex">

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-ink-400">
                          Registrations
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-800">
                          {groupRegistrations}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-ink-400">
                          Revenue
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-800">
                          ₹
                          {groupRevenue.toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits: 0,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Events Dropdown */}

                  {isExpanded && (
                    <div className="border-t border-ink-200">

                      {/* Desktop headings */}

                      <div className="hidden grid-cols-[minmax(260px,2fr)_150px_130px_150px_130px_110px] bg-ink-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400 lg:grid">
                        <div>Event</div>
                        <div>When</div>
                        <div>Category</div>
                        <div>Reg / Cap</div>
                        <div>Revenue</div>
                        <div>Status</div>
                      </div>

                      {group.events.map(
                        (event) =>
                          renderEvent(event),
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}

        </div>
      )}
    </div>
  );
}