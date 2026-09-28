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
} from 'recharts';
import {
  Users,
  Building2,
  CalendarDays,
  Ticket,
  UserCheck,
  Activity,
  TrendingUp,
} from 'lucide-react';

import {
  StatsAPI,
  type AnalyticsRange,
} from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';

type MonthlyStat = {
  month?: string;
  users?: number;
  organizations?: number;
  events?: number;
  registrations?: number;
  check_ins?: number;
};

type TopEvent = {
  id: number;
  organization_id?: number;
  title: string;
  status?: string;
  start_time?: string;
  capacity?: number;
  registrations?: number;
  check_ins?: number;
  attendance_rate?: number;
};

type TopOrganization = {
  id: number;
  name: string;
  events?: number;
  registrations?: number;
  members?: number;
};

type PlatformStats = {
  users?: number;
  organizations?: number;
  active_organizations?: number;

  events?: number;
  published_events?: number;
  draft_events?: number;
  cancelled_events?: number;
  completed_events?: number;

  registrations?: number;
  active_registrations?: number;

  tickets?: number;
  check_ins?: number;
  attendance_rate?: number;

  users_this_month?: number;
  organizations_this_month?: number;
  events_this_month?: number;
  registrations_this_month?: number;

  monthly?: MonthlyStat[];
  top_organizations?: TopOrganization[];
  top_events?: TopEvent[];
};

const RANGE_OPTIONS: {
  value: AnalyticsRange;
  label: string;
}[] = [
    { value: '7d', label: '7 Days' },
    { value: '15d', label: '15 Days' },
    { value: '30d', label: '1 Month' },
    { value: '90d', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '12m', label: '12 Months' },
  ];

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat('en-IN').format(
    Number(value ?? 0),
  );
}

function formatPercent(value: number | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

function getRangeLabel(range: AnalyticsRange) {
  return (
    RANGE_OPTIONS.find(
      (item) => item.value === range,
    )?.label ?? '1 Month'
  );
}

function formatDateLabel(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMonthLabel(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatChartLabel(
  value: string | undefined,
  range: AnalyticsRange,
) {
  if (!value) {
    return '';
  }

  if (range === '6m' || range === '12m') {
    return formatMonthLabel(value);
  }

  if (range === '90d') {
    return formatDateLabel(value);
  }

  return formatDateLabel(value);
}

function normalizeStats(raw: any): PlatformStats {
  if (!raw) {
    return {};
  }

  /*
   * Backend returns:
   * {
   *   stats: {...},
   *   range: "30d"
   * }
   *
   * Keep this compatible with both wrapped and unwrapped
   * responses.
   */
  const data = raw.stats ?? raw;

  return {
    users: Number(data.users ?? 0),
    organizations: Number(
      data.organizations ?? 0,
    ),
    active_organizations: Number(
      data.active_organizations ?? 0,
    ),

    events: Number(data.events ?? 0),
    published_events: Number(
      data.published_events ?? 0,
    ),
    draft_events: Number(
      data.draft_events ?? 0,
    ),
    cancelled_events: Number(
      data.cancelled_events ?? 0,
    ),
    completed_events: Number(
      data.completed_events ?? 0,
    ),

    registrations: Number(
      data.registrations ?? 0,
    ),
    active_registrations: Number(
      data.active_registrations ?? 0,
    ),

    tickets: Number(data.tickets ?? 0),
    check_ins: Number(
      data.check_ins ?? 0,
    ),
    attendance_rate: Number(
      data.attendance_rate ?? 0,
    ),

    users_this_month: Number(
      data.users_this_month ?? 0,
    ),
    organizations_this_month: Number(
      data.organizations_this_month ?? 0,
    ),
    events_this_month: Number(
      data.events_this_month ?? 0,
    ),
    registrations_this_month: Number(
      data.registrations_this_month ?? 0,
    ),

    monthly: Array.isArray(data.monthly)
      ? data.monthly
      : [],

    top_organizations: Array.isArray(
      data.top_organizations,
    )
      ? data.top_organizations
      : [],

    top_events: Array.isArray(
      data.top_events,
    )
      ? data.top_events
      : [],
  };
}

export function Analytics() {
  const [range, setRange] =
    useState<AnalyticsRange>('30d');

  const {
    data: rawStats,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['stats', 'platform', range],
    queryFn: () => StatsAPI.platform(range),
    staleTime: 30_000,
  });

  const stats = useMemo(
    () => normalizeStats(rawStats),
    [rawStats],
  );

  const monthlyData = useMemo(() => {
    return (stats.monthly ?? []).map(
      (item) => ({
        name: formatChartLabel(
          item.month,
          range,
        ),
        users: Number(
          item.users ?? 0,
        ),
        organizations: Number(
          item.organizations ?? 0,
        ),
        events: Number(
          item.events ?? 0,
        ),
        registrations: Number(
          item.registrations ?? 0,
        ),
        checkIns: Number(
          item.check_ins ?? 0,
        ),
      }),
    );
  }, [stats.monthly, range]);

  const topEvents = useMemo(() => {
    return (stats.top_events ?? []).map(
      (event) => ({
        ...event,
        registrations: Number(
          event.registrations ?? 0,
        ),
        checkIns: Number(
          event.check_ins ?? 0,
        ),
        attendanceRate: Number(
          event.attendance_rate ?? 0,
        ),
      }),
    );
  }, [stats.top_events]);

  const topOrganizations = useMemo(() => {
    return (
      stats.top_organizations ?? []
    ).map((organization) => ({
      ...organization,
      events: Number(
        organization.events ?? 0,
      ),
      registrations: Number(
        organization.registrations ?? 0,
      ),
      members: Number(
        organization.members ?? 0,
      ),
    }));
  }, [stats.top_organizations]);

  const attendanceRate = Number(
    stats.attendance_rate ?? 0,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Analytics
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Platform-wide EventFlow analytics.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-ink-200 bg-white"
              />
            ),
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl border border-ink-200 bg-white" />
          <div className="h-80 animate-pulse rounded-2xl border border-ink-200 bg-white" />
        </div>

        <div className="h-80 animate-pulse rounded-2xl border border-ink-200 bg-white" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Analytics
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Platform-wide EventFlow analytics.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-800">
            Unable to load platform analytics
          </p>

          <p className="mt-1 text-sm text-red-600">
            Please try again.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Platform Analytics
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Platform-wide EventFlow performance and activity.
          </p>
        </div>

        {/* RANGE SELECTOR */}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-ink-200 bg-white p-1.5">
          {RANGE_OPTIONS.map((option) => {
            const active =
              range === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setRange(option.value)
                }
                className={[
                  'rounded-xl px-3 py-2 text-xs font-semibold transition',
                  active
                    ? 'bg-ink-900 text-white shadow-sm'
                    : 'text-ink-600 hover:bg-ink-50',
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE RANGE */}

      <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Analytics period
          </p>

          <p className="mt-0.5 text-sm font-semibold text-brand-900">
            {getRangeLabel(range)}
          </p>
        </div>

        {isFetching && (
          <span className="text-xs font-medium text-brand-700">
            Updating...
          </span>
        )}
      </div>

      {/* PLATFORM KPI */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={formatNumber(
            stats.users,
          )}
          delta={
            stats.users_this_month
              ? `+${formatNumber(
                stats.users_this_month,
              )} this month`
              : undefined
          }
          tone="positive"
        />

        <StatCard
          label="Organizations"
          value={formatNumber(
            stats.organizations,
          )}
          delta={
            stats.organizations_this_month
              ? `+${formatNumber(
                stats.organizations_this_month,
              )} this month`
              : undefined
          }
          tone="positive"
        />

        <StatCard
          label="Events"
          value={formatNumber(
            stats.events,
          )}
          delta={
            stats.published_events !==
              undefined
              ? `${formatNumber(
                stats.published_events,
              )} published`
              : undefined
          }
          tone="positive"
        />

        <StatCard
          label="Registrations"
          value={formatNumber(
            stats.registrations,
          )}
          delta={
            stats.active_registrations !==
              undefined
              ? `${formatNumber(
                stats.active_registrations,
              )} active`
              : undefined
          }
          tone="positive"
        />
      </div>

      {/* SECONDARY METRICS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Active registrations
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatNumber(
                  stats.active_registrations,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Ticket className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Tickets issued
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatNumber(
                  stats.tickets,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Active organizations
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatNumber(
                  stats.active_organizations,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <UserCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Attendance rate
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatPercent(
                  attendanceRate,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EVENT LIFECYCLE */}

      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" />

          <div>
            <h3 className="font-display text-lg font-semibold">
              Event lifecycle
            </h3>

            <p className="text-xs text-ink-500">
              Event distribution for the selected period.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Published
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {formatNumber(
                stats.published_events,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Draft
            </p>

            <p className="mt-2 text-2xl font-bold text-ink-900">
              {formatNumber(
                stats.draft_events,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Cancelled
            </p>

            <p className="mt-2 text-2xl font-bold text-red-900">
              {formatNumber(
                stats.cancelled_events,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-sky-900">
              {formatNumber(
                stats.completed_events,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS */}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* REGISTRATIONS */}

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Registrations
            </h3>

            <p className="mt-1 text-xs text-ink-500">
              Registration activity for{' '}
              {getRangeLabel(range).toLowerCase()}.
            </p>
          </div>

          <div className="mt-4 h-72">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef0f2"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: '#7c8894',
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
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

                  <Bar
                    dataKey="registrations"
                    name="Registrations"
                    fill="#0ea5e9"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400">
                No registration activity for this period.
              </div>
            )}
          </div>
        </div>

        {/* PLATFORM ACTIVITY */}

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Platform activity
            </h3>

            <p className="mt-1 text-xs text-ink-500">
              Users, organizations and events created during the selected period.
            </p>
          </div>

          <div className="mt-4 h-72">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={monthlyData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef0f2"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: '#7c8894',
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
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
                    dataKey="users"
                    name="Users"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="organizations"
                    name="Organizations"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400">
                No platform activity for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP EVENTS */}

      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Top events
            </h3>

            <p className="mt-1 text-xs text-ink-500">
              Events with the highest active registrations during the selected period.
            </p>
          </div>

          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
            Top 5
          </span>
        </div>

        <div className="mt-5">
          {topEvents.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-ink-400">
              No event registration data for this period.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={topEvents}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
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
                    formatter={(value, name) => [
                      formatNumber(
                        Number(value),
                      ),
                      String(name),
                    ]}
                  />

                  <Bar
                    dataKey="registrations"
                    name="Registrations"
                    fill="#f97316"
                    radius={[
                      0,
                      8,
                      8,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* TOP ORGANIZATIONS */}

      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold">
              Top organizations
            </h3>

            <p className="mt-1 text-xs text-ink-500">
              Organizations ranked by registration activity during the selected period.
            </p>
          </div>
        </div>

        {topOrganizations.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-ink-400">
            No organization activity for this period.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-3 font-semibold">
                    Organization
                  </th>

                  <th className="pb-3 text-right font-semibold">
                    Events
                  </th>

                  <th className="pb-3 text-right font-semibold">
                    Registrations
                  </th>

                  <th className="pb-3 text-right font-semibold">
                    Members
                  </th>
                </tr>
              </thead>

              <tbody>
                {topOrganizations.map(
                  (
                    organization,
                    index,
                  ) => (
                    <tr
                      key={organization.id}
                      className="border-b border-ink-100 last:border-0"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
                            {index + 1}
                          </div>

                          <p className="font-semibold text-ink-900">
                            {organization.name}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 text-right font-medium text-ink-700">
                        {formatNumber(
                          organization.events,
                        )}
                      </td>

                      <td className="py-4 text-right font-semibold text-ink-900">
                        {formatNumber(
                          organization.registrations,
                        )}
                      </td>

                      <td className="py-4 text-right font-medium text-ink-700">
                        {formatNumber(
                          organization.members,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Registrations this month
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatNumber(
                  stats.registrations_this_month,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Events this month
              </p>

              <p className="mt-1 text-2xl font-bold text-ink-900">
                {formatNumber(
                  stats.events_this_month,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}