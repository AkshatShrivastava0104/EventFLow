import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  X,
  ChevronRight,
  CalendarDays,
  Ticket,
  CheckCircle2,
  Clock3,
  Building2,
  Mail,
} from 'lucide-react';

import { AdminAPI, EventsAPI } from '../../lib/queries';
import type {
  AdminRegistration,
  AdminRegistrationActivity,
} from '../../lib/types';

import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fmtDate, fmtMoney } from '../../lib/utils';

type Attendee = {
  userId: number;
  name: string;
  email: string;
  registrations: AdminRegistration[];
  eventIds: Set<number>;
  ticketCount: number;
  paidAmount: number;
  checkedInCount: number;
  lastRegisteredAt: string;
};

function getStatusTone(
  status: string,
): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'registered':
    case 'confirmed':
    case 'paid':
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

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Attendees() {
  const [q, setQ] = useState('');
  const [eventId, setEventId] = useState('all');
  const [organizationId, setOrganizationId] = useState('all');
  const [selectedAttendee, setSelectedAttendee] =
    useState<Attendee | null>(null);

  /*
   * Owner attendees are derived from the platform-wide registrations
   * endpoint. We intentionally use the admin endpoint here instead of
   * RegistrationsAPI.list(), because the latter represents the current
   * user's registrations and is not suitable for the platform owner.
   */
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'attendees', eventId, organizationId],
    queryFn: async () => {
      const response = await AdminAPI.listRegistrations({
        event_id: eventId === 'all' ? undefined : eventId,
        organization_id:
          organizationId === 'all' ? undefined : organizationId,
        limit: 100,
        page: 1,
        sort: 'newest',
      });

      return response;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => EventsAPI.list(),
  });

  const { data: organizationsData } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () =>
      AdminAPI.listOrganizations({
        page: 1,
        limit: 100,
      }),
  });

  const registrations: AdminRegistration[] =
    data?.registrations ?? [];

  const organizations =
    organizationsData?.organizations ??
    (Array.isArray(organizationsData) ? organizationsData : []);

  const attendees = useMemo(() => {
    const map = new Map<number, Attendee>();

    registrations.forEach((registration) => {
      /*
       * Cancelled registrations are still useful to the owner because
       * they are part of the attendee history. They are therefore not
       * removed here.
       */
      const key = registration.user_id;

      if (!map.has(key)) {
        map.set(key, {
          userId: registration.user_id,
          name: registration.user_name,
          email: registration.user_email,
          registrations: [],
          eventIds: new Set<number>(),
          ticketCount: 0,
          paidAmount: 0,
          checkedInCount: 0,
          lastRegisteredAt: registration.registered_at,
        });
      }

      const attendee = map.get(key)!;

      attendee.registrations.push(registration);
      attendee.eventIds.add(registration.event_id);

      if (registration.ticket) {
        attendee.ticketCount += 1;
      }

      if (registration.payment_status === 'paid') {
        /*
         * The current registration schema stores payment_status but does
         * not store an amount on registrations. Therefore we do not invent
         * a payment amount here.
         *
         * The value remains zero until the payment/order model is available.
         */
        attendee.paidAmount += 0;
      }

      if (registration.checkin) {
        attendee.checkedInCount += 1;
      }

      if (
        new Date(registration.registered_at).getTime() >
        new Date(attendee.lastRegisteredAt).getTime()
      ) {
        attendee.lastRegisteredAt = registration.registered_at;
      }
    });

    return Array.from(map.values())
      .filter((attendee) => {
        if (!q.trim()) return true;

        const search = q.toLowerCase().trim();

        return (
          attendee.name.toLowerCase().includes(search) ||
          attendee.email.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        if (b.eventIds.size !== a.eventIds.size) {
          return b.eventIds.size - a.eventIds.size;
        }

        return (
          new Date(b.lastRegisteredAt).getTime() -
          new Date(a.lastRegisteredAt).getTime()
        );
      });
  }, [registrations, q]);

  const summary = useMemo(() => {
    return {
      attendees: attendees.length,
      registrations: registrations.length,
      tickets: attendees.reduce(
        (total, attendee) => total + attendee.ticketCount,
        0,
      ),
      checkedIn: attendees.reduce(
        (total, attendee) => total + attendee.checkedInCount,
        0,
      ),
      paid: registrations.filter(
        (registration) => registration.payment_status === 'paid',
      ).length,
    };
  }, [attendees, registrations]);

  const selectedRegistrations = selectedAttendee
    ? [...selectedAttendee.registrations].sort(
      (a, b) =>
        new Date(b.registered_at).getTime() -
        new Date(a.registered_at).getTime(),
    )
    : [];

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Attendees
          </h2>
          <p className="text-sm text-ink-500">
            View unique people registered across the platform and their
            event activity.
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Unique attendees
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {summary.attendees}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
                <Users className="h-5 w-5 text-ink-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Registrations
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {summary.registrations}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
                <CalendarDays className="h-5 w-5 text-ink-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Tickets issued
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {summary.tickets}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
                <Ticket className="h-5 w-5 text-ink-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Checked in
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {summary.checkedIn}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
                <CheckCircle2 className="h-5 w-5 text-ink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
            <Search className="h-4 w-4 text-ink-400" />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search attendees by name or email"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All events</option>

            {(events || []).map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>

          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All organizations</option>

            {organizations.map((organization: any) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Attendee</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Registrations</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3">Check-ins</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-10" />
                      </td>
                    </tr>
                  ))
                ) : attendees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <EmptyState
                        icon={<Users className="h-5 w-5" />}
                        title="No attendees found"
                      />
                    </td>
                  </tr>
                ) : (
                  attendees.map((attendee) => (
                    <tr
                      key={attendee.userId}
                      className="cursor-pointer hover:bg-ink-50"
                      onClick={() => setSelectedAttendee(attendee)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold uppercase text-white">
                            {attendee.name?.slice(0, 1) || '?'}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {attendee.name}
                            </div>

                            <div className="flex items-center gap-1 text-xs text-ink-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">
                                {attendee.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {attendee.eventIds.size}
                          </span>
                          <span className="text-xs text-ink-500">
                            event
                            {attendee.eventIds.size === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {attendee.registrations.length}
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {attendee.ticketCount}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          tone={
                            attendee.checkedInCount > 0
                              ? 'green'
                              : 'gray'
                          }
                        >
                          {attendee.checkedInCount}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-xs text-ink-500">
                        {fmtDate(attendee.lastRegisteredAt)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAttendee(attendee);
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 px-3 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
                        >
                          View
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attendee detail drawer */}
      {selectedAttendee && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close attendee details"
            className="absolute inset-0 cursor-default bg-black/30"
            onClick={() => setSelectedAttendee(null)}
          />

          <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-ink-200 bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-start justify-between border-b border-ink-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-lg font-bold uppercase text-white">
                  {selectedAttendee.name?.slice(0, 1) || '?'}
                </div>

                <div>
                  <h3 className="font-display text-xl font-semibold">
                    {selectedAttendee.name}
                  </h3>

                  <div className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedAttendee.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttendee(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer summary */}
            <div className="grid grid-cols-2 gap-3 border-b border-ink-200 bg-ink-50/50 p-5 sm:grid-cols-4">
              <div>
                <p className="text-xs text-ink-500">Events</p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedAttendee.eventIds.size}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Registrations</p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedAttendee.registrations.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Tickets</p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedAttendee.ticketCount}
                </p>
              </div>

              <div>
                <p className="text-xs text-ink-500">Check-ins</p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedAttendee.checkedInCount}
                </p>
              </div>
            </div>

            {/* Registration history */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-4">
                <h4 className="font-semibold">Event history</h4>
                <p className="text-xs text-ink-500">
                  Every registration associated with this attendee.
                </p>
              </div>

              <div className="space-y-4">
                {selectedRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="rounded-2xl border border-ink-200 bg-white p-4"
                  >
                    {/* Event */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 shrink-0 text-ink-500" />

                          <h5 className="truncate font-semibold">
                            {registration.event_title}
                          </h5>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                          <Building2 className="h-3.5 w-3.5" />
                          {registration.organization_name}
                        </div>
                      </div>

                      <Badge
                        tone={getStatusTone(
                          registration.registration_status,
                        )}
                      >
                        {formatStatus(
                          registration.registration_status,
                        )}
                      </Badge>
                    </div>

                    {/* Registration metadata */}
                    <div className="mt-4 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-ink-500">
                          Registered
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {fmtDate(registration.registered_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-ink-500">
                          Payment
                        </p>

                        <div className="mt-1">
                          <Badge
                            tone={getStatusTone(
                              registration.payment_status,
                            )}
                          >
                            {formatStatus(
                              registration.payment_status,
                            )}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-ink-500">
                          Ticket
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {registration.ticket
                            ? registration.ticket.ticket_number
                            : 'No ticket issued'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-ink-500">
                          Check-in
                        </p>

                        {registration.checkin ? (
                          <div className="mt-1">
                            <Badge tone="green">
                              Checked in
                            </Badge>

                            <p className="mt-1 text-xs text-ink-500">
                              {fmtDate(
                                registration.checkin.checked_in_at,
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <Badge tone="gray">
                              Not checked in
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Activity */}
                    {registration.activity?.length > 0 && (
                      <div className="mt-5 border-t border-ink-100 pt-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
                          Activity
                        </p>

                        <div className="space-y-3">
                          {(
                            [...registration.activity] as AdminRegistrationActivity[]
                          )
                            .sort(
                              (a, b) =>
                                new Date(
                                  a.occurred_at,
                                ).getTime() -
                                new Date(
                                  b.occurred_at,
                                ).getTime(),
                            )
                            .map((activity, index) => (
                              <div
                                key={`${activity.type}-${activity.occurred_at}-${index}`}
                                className="flex gap-3"
                              >
                                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-50">
                                  {activity.type ===
                                    'checked_in' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-ink-700" />
                                  ) : activity.type ===
                                    'ticket_created' ? (
                                    <Ticket className="h-3.5 w-3.5 text-ink-700" />
                                  ) : (
                                    <Clock3 className="h-3.5 w-3.5 text-ink-700" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {activity.label}
                                  </p>

                                  <p className="text-xs text-ink-500">
                                    {fmtDate(activity.occurred_at)}
                                  </p>

                                  {activity.description && (
                                    <p className="mt-1 text-xs text-ink-500">
                                      {activity.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedRegistrations.length === 0 && (
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="No registration history"
                />
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-ink-200 bg-white px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setSelectedAttendee(null)}
              >
                Close
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}