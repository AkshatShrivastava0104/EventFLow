import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  StatsAPI,
  EventsAPI,
  OrgsAPI,
} from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';
import {
  CalendarDays,
  Ticket,
  Users,
  ScanLine,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fmtDate } from '../../lib/utils';

export function StaffOverview() {
  const {
    data: organizations = [],
    isLoading: organizationsLoading,
  } = useQuery({
    queryKey: ['organizations', 'staff'],
    queryFn: () => OrgsAPI.list(),
  });

  const organization = organizations[0];

  const {
    data: statsResponse,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: [
      'stats',
      'staff',
      organization?.id,
    ],
    queryFn: () =>
      StatsAPI.operations(organization!.id),
    enabled: !!organization?.id,
  });

  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: [
      'events',
      'staff',
      organization?.id,
    ],
    queryFn: () =>
      EventsAPI.listByOrganization(
        organization!.id,
        {
          page: 1,
          limit: 5,
        }
      ),
    enabled: !!organization?.id,
  });

  const stats =
    statsResponse?.stats ??
    statsResponse;

  const today = new Date();

  const eventsToday =
    stats?.today_events ??
    events.filter(
      (event) =>
        event.start_at &&
        new Date(event.start_at).toDateString() ===
        today.toDateString()
    ).length;

  const totalTickets =
    stats?.expected_attendees ?? 0;

  const checkedIn =
    stats?.check_ins_today ?? 0;

  const attendanceRate =
    totalTickets > 0
      ? Math.round(
        (checkedIn / totalTickets) * 100
      )
      : 0;

  const loading =
    organizationsLoading ||
    statsLoading ||
    eventsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Staff dashboard
          </h2>

          <p className="text-sm text-ink-500">
            Everything you need for the door.
          </p>
        </div>

        <Link to="/staff/scanner">
          <Button
            variant="secondary"
            leftIcon={
              <ScanLine className="h-4 w-4" />
            }
          >
            Open scanner
          </Button>
        </Link>
      </div>

      {/* Organization */}
      {organization && (
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Organization
          </p>

          <p className="mt-1 font-display text-lg font-semibold">
            {organization.name}
          </p>

          {organization.description && (
            <p className="mt-1 text-sm text-ink-500">
              {organization.description}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Events today"
          value={loading ? '—' : eventsToday}
          icon={
            <CalendarDays className="h-5 w-5" />
          }
        />

        <StatCard
          label="Expected attendees"
          value={loading ? '—' : totalTickets}
          icon={
            <Ticket className="h-5 w-5" />
          }
        />

        <StatCard
          label="Checked in today"
          value={loading ? '—' : checkedIn}
          icon={
            <Users className="h-5 w-5" />
          }
        />

        <StatCard
          label="Attendance rate"
          value={
            loading
              ? '—'
              : `${attendanceRate}%`
          }
          icon={
            <Users className="h-5 w-5" />
          }
        />
      </div>

      {/* Pending check-ins */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Pending check-ins
          </p>

          <p className="mt-1 font-display text-2xl font-semibold">
            {loading
              ? '—'
              : stats?.pending_check_ins ?? 0}
          </p>

          <p className="mt-1 text-xs text-ink-500">
            Expected attendees who have not checked in yet.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Upcoming events
          </p>

          <p className="mt-1 font-display text-2xl font-semibold">
            {loading
              ? '—'
              : stats?.upcoming_events ?? 0}
          </p>

          <p className="mt-1 text-xs text-ink-500">
            Events scheduled after today.
          </p>
        </div>
      </div>

      {/* Events */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Today's & upcoming events
            </h3>

            <p className="mt-1 text-xs text-ink-500">
              Published events in your organization.
            </p>
          </div>

          <Link
            to="/staff/events"
            className="text-xs font-semibold text-brand-600"
          >
            All events →
          </Link>
        </div>

        <div className="mt-3 divide-y divide-ink-100">
          {events.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-ink-300" />

              <p className="mt-2 text-sm font-medium text-ink-600">
                No upcoming events
              </p>

              <p className="mt-1 text-xs text-ink-400">
                There are no published events available for your organization.
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center gap-4 py-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {event.title}
                  </p>

                  <p className="text-xs text-ink-500">
                    {fmtDate(event.start_at)}
                    {event.venue
                      ? ` • ${event.venue}`
                      : ''}
                    {event.city
                      ? `, ${event.city}`
                      : ''}
                  </p>
                </div>

                <Badge tone="green" dot>
                  {event.registered_count ?? 0}{' '}
                  registered
                </Badge>

                <Link
                  to={`/staff/scanner?event_id=${event.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                >
                  Check-in
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's event operations */}
      {stats?.today_events_list?.length > 0 && (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Today's operations
              </h3>

              <p className="mt-1 text-xs text-ink-500">
                Check-in activity for today's events.
              </p>
            </div>

            <Link
              to="/staff/scanner"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
            >
              Open scanner
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-ink-100">
            {stats.today_events_list.map(
              (event: any) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {event.title}
                    </p>

                    <p className="text-xs text-ink-500">
                      {event.start_time
                        ? fmtDate(event.start_time)
                        : ''}
                      {event.venue
                        ? ` • ${event.venue}`
                        : ''}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {event.check_ins ?? 0}/
                      {event.registrations ?? 0}
                    </p>

                    <p className="text-xs text-ink-500">
                      checked in
                    </p>
                  </div>

                  <Link
                    to={`/staff/scanner?event_id=${event.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                  >
                    Check-in
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}