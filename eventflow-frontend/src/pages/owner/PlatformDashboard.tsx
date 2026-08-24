import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDateShort } from '@/lib/format';
import { fmtNumber } from '@/lib/format';
import {
  EVENT_STATUS_COLOR,
  REGISTRATION_STATUS_COLOR,
  EVENT_STATUS_META,
  registrationStatusMeta,
} from '@/lib/constants';
import { normalizeError } from '@/api/client';

export function PlatformDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
  });

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Everything happening across EventFlow, at a glance."
      />

      {error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Users"
              value={fmtNumber(data.totals.users)}
              hint={`+${fmtNumber(data.new_users_30d)} in 30 days`}
              icon={<Users className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label="Organizations"
              value={fmtNumber(data.totals.organizations)}
              icon={<Building2 className="h-5 w-5" />}
            />
            <StatCard
              label="Events"
              value={fmtNumber(data.totals.events)}
              hint={`+${fmtNumber(data.new_events_30d)} in 30 days`}
              icon={<CalendarDays className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Registrations"
              value={fmtNumber(data.totals.registrations)}
              hint={`+${fmtNumber(data.new_registrations_30d)} in 30 days`}
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              label="Tickets issued"
              value={fmtNumber(data.totals.tickets)}
              icon={<Ticket className="h-5 w-5" />}
            />
            <StatCard
              label="Check-ins"
              value={fmtNumber(data.totals.checkins)}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Check-in rate"
              value={`${Math.round((data.checkin_rate ?? 0) * 100)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="warning"
            />
            <StatCard
              label="Platform admins"
              value={fmtNumber(data.totals.admins)}
              icon={<Activity className="h-5 w-5" />}
              tone="danger"
            />
          </div>

          <div className="mt-6">
            <LineChartCard
              title="Growth (last 30 days)"
              description="New users, events and registrations per day."
              data={(data.trend ?? []).map((t) => ({
                label: fmtDateShort(t.date),
                Users: t.users,
                Events: t.events,
                Registrations: t.registrations,
              }))}
              xKey="label"
              series={[
                { key: 'Users', label: 'Users', color: '#2563eb' },
                { key: 'Events', label: 'Events', color: '#10b981' },
                { key: 'Registrations', label: 'Registrations', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BarChartCard
              title="Events by status"
              data={Object.entries(data.events_by_status ?? {}).map(([status, value]) => ({
                label: EVENT_STATUS_META[status as keyof typeof EVENT_STATUS_META]?.label ?? status,
                value,
                color: EVENT_STATUS_COLOR[status] ?? '#a1a1aa',
              }))}
            />
            <BarChartCard
              title="Registrations by status"
              data={Object.entries(data.registrations_by_status ?? {}).map(
                ([status, value]) => ({
                  label: registrationStatusMeta(status).label,
                  value,
                  color: REGISTRATION_STATUS_COLOR[status] ?? '#a1a1aa',
                }),
              )}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
