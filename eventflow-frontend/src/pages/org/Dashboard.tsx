import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, Plus, Send, Users } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { organizationsApi } from '@/api/organizations';
import { useOrg } from '@/contexts/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { fmtDateTime } from '@/lib/format';
import { normalizeError } from '@/api/client';

export function OrgDashboard() {
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

  const stats = useMemo(() => {
    const by = (s: string) => events.filter((e) => e.status === s).length;
    return {
      total: eventsQ.data?.pagination.total ?? events.length,
      published: by('published'),
      draft: by('draft'),
    };
  }, [events, eventsQ.data]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.status === 'published' && e.start_time && new Date(e.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <div>
      <PageHeader
        title={activeOrg?.name ? `${activeOrg.name} dashboard` : 'Dashboard'}
        description="Your workspace at a glance."
        actions={
          <Link to="/org/events/new">
            <Button icon={<Plus className="h-4 w-4" />}>New event</Button>
          </Link>
        }
      />

      {eventsQ.error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(eventsQ.error).message}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={eventsQ.isLoading ? '—' : stats.total}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Published"
          value={eventsQ.isLoading ? '—' : stats.published}
          icon={<Send className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Drafts"
          value={eventsQ.isLoading ? '—' : stats.draft}
          icon={<CalendarPlus className="h-5 w-5" />}
        />
        <StatCard
          label="Members"
          value={membersQ.isLoading ? '—' : membersQ.data?.members?.length ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <Link to="/org/events" className="text-sm font-medium text-accent-700 hover:text-accent-800">
              View all
            </Link>
          </CardHeader>

          {eventsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="No upcoming events"
              description="Publish an event to see it here."
              action={
                <Link to="/org/events/new">
                  <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                    Create event
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/org/events/${e.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{e.title}</p>
                      <p className="text-xs text-ink-500">{fmtDateTime(e.start_time)}</p>
                    </div>
                    <EventStatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
