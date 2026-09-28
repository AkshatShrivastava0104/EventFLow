import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Ticket,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { StatsAPI } from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { fmtDate } from '../../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export function OwnerOverview() {
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['stats', 'platform', '30d'],
    queryFn: () => StatsAPI.platform('30d'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const stats = response?.stats ?? response;

  const monthly = stats?.monthly ?? [];
  const topEvents = stats?.top_events ?? [];
  const topOrganizations = stats?.top_organizations ?? [];

  const attendanceRate = Number(
    stats?.attendance_rate ?? 0
  );

  return (
    <div className="space-y-6">
      {/* =====================================================
          Header
      ===================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Platform overview 👋
          </h2>

          <p className="text-sm text-ink-500">
            Here's what's happening across EventFlow.
          </p>
        </div>

      </div>

      {/* =====================================================
          Error
      ===================================================== */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load platform statistics. Please try again.
        </div>
      )}

      {/* =====================================================
          Main Stats
      ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-28"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Total users"
              value={stats?.users ?? 0}
              delta={`+${stats?.users_this_month ?? 0} this month`}
              tone="positive"
              icon={<Users className="h-5 w-5" />}
            />

            <StatCard
              label="Organizations"
              value={stats?.organizations ?? 0}
              delta={`+${stats?.organizations_this_month ?? 0} this month`}
              tone="positive"
              icon={<Building2 className="h-5 w-5" />}
            />

            <StatCard
              label="Total registrations"
              value={stats?.registrations ?? 0}
              delta={`+${stats?.registrations_this_month ?? 0} this month`}
              tone="positive"
              icon={<Ticket className="h-5 w-5" />}
            />

            <StatCard
              label="Total events"
              value={stats?.events ?? 0}
              delta={`+${stats?.events_this_month ?? 0} this month`}
              icon={<CalendarDays className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* =====================================================
          Secondary Stats
      ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published events"
          value={stats?.published_events ?? 0}
          icon={<CalendarDays className="h-5 w-5" />}
        />

        <StatCard
          label="Active registrations"
          value={stats?.active_registrations ?? 0}
          icon={<Ticket className="h-5 w-5" />}
        />

        <StatCard
          label="Tickets issued"
          value={stats?.tickets ?? 0}
          icon={<Ticket className="h-5 w-5" />}
        />

        <StatCard
          label="Attendance rate"
          value={`${attendanceRate.toFixed(1)}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {/* =====================================================
          Monthly Activity
      ===================================================== */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Platform activity
              </h3>

              <p className="text-xs text-ink-500">
                Last 6 months
              </p>
            </div>

            <Badge
              tone="green"
              dot
            >
              Live
            </Badge>
          </div>

          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient
                    id="gUsers"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0"
                      stopColor="#10b981"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="1"
                      stopColor="#10b981"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="gRegistrations"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0"
                      stopColor="#0ea5e9"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="1"
                      stopColor="#0ea5e9"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef0f2"
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fill: '#7c8894',
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: '#7c8894',
                    fontSize: 12,
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

                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#10b981"
                  fill="url(#gUsers)"
                  strokeWidth={2}
                  name="Users"
                />

                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="#0ea5e9"
                  fill="url(#gRegistrations)"
                  strokeWidth={2}
                  name="Registrations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Event Breakdown */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Event status
              </h3>

              <p className="text-xs text-ink-500">
                Current platform breakdown
              </p>
            </div>

            <CalendarDays className="h-4 w-4 text-brand-600" />
          </div>

          <div className="mt-6 space-y-4">
            {[
              {
                label: 'Published',
                value: stats?.published_events ?? 0,
                tone: 'green',
              },
              {
                label: 'Draft',
                value: stats?.draft_events ?? 0,
                tone: 'gray',
              },
              {
                label: 'Completed',
                value: stats?.completed_events ?? 0,
                tone: 'blue',
              },
              {
                label: 'Cancelled',
                value: stats?.cancelled_events ?? 0,
                tone: 'red',
              },
            ].map((item) => {
              const total = Math.max(
                1,
                Number(stats?.events ?? 0)
              );

              const percentage =
                (Number(item.value) / total) * 100;

              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {item.label}
                    </span>

                    <span className="text-ink-500">
                      {item.value}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.min(
                          100,
                          percentage
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================
          Top Organizations
      ===================================================== */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Top organizations
              </h3>

              <p className="text-xs text-ink-500">
                Based on platform activity
              </p>
            </div>

            <TrendingUp className="h-4 w-4 text-brand-600" />
          </div>

          <div className="mt-4 space-y-3">
            {topOrganizations.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-500">
                No organizations available yet.
              </div>
            ) : (
              topOrganizations
                .slice(0, 5)
                .map((organization: any) => (
                  <div
                    key={organization.id}
                    className="flex items-center gap-4 rounded-xl border border-ink-100 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {organization.name}
                      </p>

                      <p className="text-xs text-ink-500">
                        {organization.events ?? 0} events •{' '}
                        {organization.members ?? 0} members
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {organization.registrations ?? 0}
                      </p>

                      <p className="text-xs text-ink-500">
                        registrations
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* =====================================================
            Top Events
        ===================================================== */}
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Top events
              </h3>

              <p className="text-xs text-ink-500">
                Based on registrations
              </p>
            </div>

            <TrendingUp className="h-4 w-4 text-brand-600" />
          </div>

          <div className="mt-4 h-64">
            {topEvents.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-500">
                No event data available yet.
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={topEvents.slice(0, 5)}
                  layout="vertical"
                  margin={{
                    left: 10,
                    right: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef0f2"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fill: '#7c8894',
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    dataKey="title"
                    type="category"
                    tick={{
                      fill: '#2b333d',
                      fontSize: 12,
                    }}
                    width={140}
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
                    fill="#10b981"
                    radius={[0, 8, 8, 0]}
                    name="Registrations"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          Upcoming Events
      ===================================================== */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Upcoming events
            </h3>

            <p className="text-xs text-ink-500">
              Events currently scheduled across EventFlow
            </p>
          </div>

          <Link
            to="/dashboard/events"
            className="text-xs font-semibold text-brand-600"
          >
            View all →
          </Link>
        </div>

        <div className="mt-3 divide-y divide-ink-100">
          {topEvents
            .filter(
              (event: any) =>
                event.start_time &&
                new Date(event.start_time) >= new Date()
            )
            .slice(0, 5)
            .map((event: any) => (
              <div
                key={event.id}
                className="flex items-center gap-4 py-3"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {event.title}
                  </p>

                  <p className="text-xs text-ink-500">
                    {fmtDate(event.start_time)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {event.registrations ?? 0}
                    {event.capacity
                      ? `/${event.capacity}`
                      : ''}
                  </p>

                  <Badge
                    tone={
                      event.status === 'published'
                        ? 'green'
                        : event.status === 'draft'
                          ? 'gray'
                          : event.status === 'cancelled'
                            ? 'red'
                            : 'blue'
                    }
                  >
                    {event.status}
                  </Badge>
                </div>
              </div>
            ))}

          {topEvents.filter(
            (event: any) =>
              event.start_time &&
              new Date(event.start_time) >= new Date()
          ).length === 0 && (
              <div className="py-8 text-center text-sm text-ink-500">
                No upcoming events found.
              </div>
            )}
        </div>
      </div>

      {/* =====================================================
          Platform Summary
      ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Active organizations
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {stats?.active_organizations ?? 0}
          </p>

          <p className="mt-1 text-xs text-ink-500">
            Organizations with active membership
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Check-ins
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {stats?.check_ins ?? 0}
          </p>

          <p className="mt-1 text-xs text-ink-500">
            Total completed check-ins
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Platform events this month
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {stats?.events_this_month ?? 0}
          </p>

          <p className="mt-1 text-xs text-ink-500">
            Newly created events
          </p>
        </div>
      </div>

      {/* =====================================================
          Note
      ===================================================== */}
      <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs text-ink-500">
        <ArrowUpRight className="h-4 w-4 shrink-0" />
        Platform statistics are calculated from the EventFlow
        backend and are scoped to the platform owner.
      </div>
    </div>
  );
}