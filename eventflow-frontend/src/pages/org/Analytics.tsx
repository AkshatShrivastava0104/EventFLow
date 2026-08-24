import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, subMonths } from 'date-fns';
import { CalendarDays, CheckCircle2, Send, Users } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { organizationsApi } from '@/api/organizations';
import { useOrg } from '@/contexts/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EVENT_STATUS_COLOR, EVENT_STATUS_META, CHART_COLOR } from '@/lib/constants';
import type { EventStatus } from '@/types/event';
import { normalizeError } from '@/api/client';

const STATUS_ORDER: EventStatus[] = ['draft', 'published', 'completed', 'cancelled'];

export function Analytics() {
  const { activeOrgId, activeOrg } = useOrg();

  const eventsQ = useQuery({
    queryKey: ['org', activeOrgId, 'events', 'all'],
    queryFn: () => eventsApi.listByOrg(activeOrgId!, { page: 1, limit: 100 }),
    enabled: activeOrgId != null,
  });
  const membersQ = useQuery({
    queryKey: ['org', activeOrgId, 'members'],
    queryFn: () => organizationsApi.members(activeOrgId!),
    enabled: activeOrgId != null,
  });

  const events = useMemo(() => eventsQ.data?.events ?? [], [eventsQ.data]);

  const totals = useMemo(() => {
    const by = (s: EventStatus) => events.filter((e) => e.status === s).length;
    const capacity = events.reduce((sum, e) => sum + (e.capacity ?? 0), 0);
    return {
      total: eventsQ.data?.pagination.total ?? events.length,
      published: by('published'),
      completed: by('completed'),
      capacity,
    };
  }, [events, eventsQ.data]);

  const statusData = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        label: EVENT_STATUS_META[s].label,
        value: events.filter((e) => e.status === s).length,
        color: EVENT_STATUS_COLOR[s],
      })),
    [events],
  );

  const monthlyData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(now, 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), value: 0 };
    });
    const index = new Map(buckets.map((b) => [b.key, b]));
    for (const e of events) {
      if (!e.created_at) continue;
      const key = format(startOfMonth(new Date(e.created_at)), 'yyyy-MM');
      const bucket = index.get(key);
      if (bucket) bucket.value += 1;
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }, [events]);

  const isLoading = eventsQ.isLoading;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={activeOrg?.name ? `Insights for ${activeOrg.name}.` : 'Workspace insights.'}
      />

      {eventsQ.error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(eventsQ.error).message}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={isLoading ? '—' : totals.total}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Published"
          value={isLoading ? '—' : totals.published}
          icon={<Send className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Completed"
          value={isLoading ? '—' : totals.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Members"
          value={membersQ.isLoading ? '—' : membersQ.data?.members?.length ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <LineChartCard
            title="Events created"
            description="New events over the last 6 months."
            data={monthlyData}
            xKey="label"
            series={[{ key: 'value', label: 'Events', color: CHART_COLOR.accent }]}
          />
          <BarChartCard
            title="Events by status"
            description="Distribution across the event lifecycle."
            data={statusData}
          />
        </div>
      )}

      {!isLoading && totals.capacity > 0 && (
        <p className="mt-4 text-sm text-ink-500">
          Combined seated capacity across all events:{' '}
          <span className="font-medium text-ink-900">{totals.capacity.toLocaleString()}</span>
        </p>
      )}
    </div>
  );
}
