import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
  User,
  CalendarDays,
  Building2,
  Ticket,
  CheckCircle2,
  Clock3,
  CreditCard,
  Activity,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

import {
  AdminAPI,
  type AdminRegistrationFilters,
} from '../../lib/queries';

import type {
  AdminRegistration,
  AdminRegistrationActivity,
} from '../../lib/types';

import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

import {
  fmtDate,
  fmtMoney,
  fmtRelative,
} from '../../lib/utils';

import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

type RegistrationResponse = {
  registrations?: AdminRegistration[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

type Tone = 'green' | 'red' | 'gray' | 'orange' | 'blue';

function normalizeResponse(
  data: unknown,
): RegistrationResponse {
  if (!data || typeof data !== 'object') {
    return {
      registrations: [],
      pagination: {
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        total_pages: 0,
      },
    };
  }

  const response = data as RegistrationResponse;

  return {
    registrations: Array.isArray(response.registrations)
      ? response.registrations
      : [],
    pagination: response.pagination ?? {
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  };
}

function formatLabel(value: string | undefined) {
  if (!value) return '—';

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function getStatusTone(status: string): Tone {
  switch (status) {
    case 'registered':
    case 'confirmed':
      return 'green';

    case 'cancelled':
      return 'red';

    case 'pending':
      return 'orange';

    case 'waitlisted':
    case 'waitlist':
      return 'orange';

    default:
      return 'gray';
  }
}

function getPaymentTone(status: string): Tone {
  switch (status) {
    case 'paid':
    case 'free':
      return 'green';

    case 'refunded':
      return 'red';

    case 'pending':
      return 'orange';

    default:
      return 'gray';
  }
}

function ActivityItem({
  activity,
}: {
  activity: AdminRegistrationActivity;
}) {
  const icon =
    activity.type === 'checked_in' ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : activity.type === 'ticket_created' ? (
      <Ticket className="h-4 w-4" />
    ) : (
      <Activity className="h-4 w-4" />
    );

  return (
    <div className="relative flex gap-3">
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink-900">
            {activity.label}
          </p>

          <span className="text-xs text-ink-400">
            {fmtRelative(activity.occurred_at)}
          </span>
        </div>

        {activity.description && (
          <p className="mt-1 text-xs leading-5 text-ink-500">
            {activity.description}
          </p>
        )}

        <p className="mt-1 text-[11px] text-ink-400">
          {fmtDate(
            activity.occurred_at,
            'MMM d, yyyy · h:mm a',
          )}
        </p>
      </div>
    </div>
  );
}

function RegistrationDrawer({
  registration,
  onClose,
}: {
  registration: AdminRegistration;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close registration details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Registration details
            </p>

            <h3 className="mt-1 text-xl font-semibold text-ink-900">
              #{registration.id}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Attendee */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Attendee
              </h4>
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="font-semibold text-ink-900">
                {registration.user_name || 'Unknown attendee'}
              </p>

              <p className="mt-1 text-sm text-ink-500">
                {registration.user_email || '—'}
              </p>
            </div>
          </section>

          {/* Event */}
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Event
              </h4>
            </div>

            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <p className="font-semibold text-ink-900">
                {registration.event_title}
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm text-ink-500">
                <Building2 className="h-4 w-4" />
                {registration.organization_name}
              </div>
            </div>
          </section>

          {/* Registration status */}
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Registration
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs text-ink-400">
                  Status
                </p>

                <div className="mt-2">
                  <Badge
                    tone={getStatusTone(
                      registration.registration_status,
                    )}
                    dot
                  >
                    {formatLabel(
                      registration.registration_status,
                    )}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs text-ink-400">
                  Payment
                </p>

                <div className="mt-2">
                  <Badge
                    tone={getPaymentTone(
                      registration.payment_status,
                    )}
                  >
                    {formatLabel(
                      registration.payment_status,
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-ink-100 p-4">
              <p className="text-xs text-ink-400">
                Registered at
              </p>

              <p className="mt-1 text-sm font-semibold text-ink-900">
                {fmtDate(
                  registration.registered_at,
                  'MMM d, yyyy · h:mm a',
                )}
              </p>

              <p className="mt-1 text-xs text-ink-400">
                {fmtRelative(
                  registration.registered_at,
                )}
              </p>
            </div>
          </section>

          {/* Ticket */}
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Ticket
              </h4>
            </div>

            {registration.ticket ? (
              <div className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-ink-400">
                      Ticket number
                    </p>

                    <p className="mt-1 font-mono text-sm font-semibold text-ink-900">
                      {registration.ticket.ticket_number}
                    </p>
                  </div>

                  <Badge tone="green">
                    Generated
                  </Badge>
                </div>

                <div className="mt-4 border-t border-ink-100 pt-4">
                  <p className="text-xs text-ink-400">
                    Generated at
                  </p>

                  <p className="mt-1 text-sm text-ink-700">
                    {fmtDate(
                      registration.ticket.created_at,
                      'MMM d, yyyy · h:mm a',
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4">
                <p className="text-sm font-medium text-ink-600">
                  No ticket generated
                </p>

                <p className="mt-1 text-xs text-ink-400">
                  This registration does not currently have
                  a ticket record.
                </p>
              </div>
            )}
          </section>

          {/* Check-in */}
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Check-in
              </h4>
            </div>

            {registration.checkin ? (
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">
                      Checked in
                    </p>

                    <p className="mt-1 text-xs text-ink-500">
                      {fmtDate(
                        registration.checkin.checked_in_at,
                        'MMM d, yyyy · h:mm a',
                      )}
                    </p>
                  </div>

                  <CheckCircle2 className="h-5 w-5 text-brand-600" />
                </div>

                {(registration.checkin.volunteer_name ||
                  registration.checkin.volunteer_email) && (
                    <div className="mt-4 border-t border-green-100 pt-4">
                      <p className="text-xs text-ink-400">
                        Checked in by
                      </p>

                      <p className="mt-1 text-sm font-semibold text-ink-800">
                        {registration.checkin.volunteer_name ||
                          registration.checkin.volunteer_email}
                      </p>

                      {registration.checkin.volunteer_name &&
                        registration.checkin.volunteer_email && (
                          <p className="mt-0.5 text-xs text-ink-500">
                            {registration.checkin.volunteer_email}
                          </p>
                        )}
                    </div>
                  )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-ink-400" />

                  <p className="text-sm font-medium text-ink-600">
                    Not checked in
                  </p>
                </div>

                <p className="mt-1 text-xs text-ink-400">
                  No check-in record exists for this ticket.
                </p>
              </div>
            )}
          </section>

          {/* Activity */}
          <section className="mt-6">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />

              <h4 className="text-sm font-semibold text-ink-900">
                Activity
              </h4>
            </div>

            {registration.activity?.length ? (
              <div className="relative">
                {registration.activity.length > 1 && (
                  <div className="absolute left-4 top-8 bottom-8 w-px bg-ink-100" />
                )}

                {registration.activity.map(
                  (activity, index) => (
                    <ActivityItem
                      key={`${activity.type}-${activity.occurred_at}-${index}`}
                      activity={activity}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-400">
                No activity available.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export function Registrations() {
  const [q, setQ] = useState('');
  const [eventId, setEventId] =
    useState<string>('all');
  const [organizationId, setOrganizationId] =
    useState<string>('all');
  const [status, setStatus] =
    useState<string>('all');
  const [paymentStatus, setPaymentStatus] =
    useState<string>('all');
  const [checkinStatus, setCheckinStatus] =
    useState<string>('all');
  const [sort, setSort] =
    useState<NonNullable<AdminRegistrationFilters['sort']>>(
      'newest',
    );
  const [page, setPage] = useState(1);
  const [selectedRegistration, setSelectedRegistration] =
    useState<AdminRegistration | null>(null);

  const filters = useMemo<AdminRegistrationFilters>(() => {
    return {
      search: q.trim() || undefined,
      event_id:
        eventId === 'all'
          ? undefined
          : Number(eventId),
      organization_id:
        organizationId === 'all'
          ? undefined
          : Number(organizationId),
      status:
        status === 'all'
          ? undefined
          : status,
      payment_status:
        paymentStatus === 'all'
          ? undefined
          : paymentStatus,
      checkin:
        checkinStatus === 'all'
          ? ''
          : (checkinStatus as
            | 'checked_in'
            | 'not_checked_in'),
      sort,
      page,
      limit: PAGE_SIZE,
    };
  }, [
    q,
    eventId,
    organizationId,
    status,
    paymentStatus,
    checkinStatus,
    sort,
    page,
  ]);

  const {
    data: registrationsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      'admin',
      'registrations',
      filters,
    ],
    queryFn: () =>
      AdminAPI.listRegistrations(filters),
  });

  const response = useMemo(
    () =>
      normalizeResponse(
        registrationsData,
      ),
    [registrationsData],
  );

  const registrations =
    response.registrations ?? [];

  const pagination =
    response.pagination ?? {
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      total_pages: 0,
    };

  /*
   * These counters represent the currently loaded
   * result set. The backend pagination total is used
   * separately for the overall result count.
   */
  const summary = useMemo(() => {
    const total = pagination.total;

    const registered = registrations.filter(
      (item) =>
        item.registration_status ===
        'registered' ||
        item.registration_status ===
        'confirmed',
    ).length;

    const pending = registrations.filter(
      (item) =>
        item.registration_status ===
        'pending',
    ).length;

    const cancelled = registrations.filter(
      (item) =>
        item.registration_status ===
        'cancelled',
    ).length;

    const checkedIn = registrations.filter(
      (item) => Boolean(item.checkin),
    ).length;

    const paid = registrations.filter(
      (item) =>
        item.payment_status === 'paid',
    ).length;

    return {
      total,
      registered,
      pending,
      cancelled,
      checkedIn,
      paid,
    };
  }, [registrations, pagination.total]);

  const organizations = useMemo(() => {
    const map = new Map<number, string>();

    registrations.forEach((registration) => {
      if (
        registration.organization_id &&
        registration.organization_name
      ) {
        map.set(
          registration.organization_id,
          registration.organization_name,
        );
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({
        id,
        name,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      );
  }, [registrations]);

  const events = useMemo(() => {
    const map = new Map<number, string>();

    registrations.forEach((registration) => {
      if (
        registration.event_id &&
        registration.event_title
      ) {
        map.set(
          registration.event_id,
          registration.event_title,
        );
      }
    });

    return Array.from(map.entries())
      .map(([id, title]) => ({
        id,
        title,
      }))
      .sort((a, b) =>
        a.title.localeCompare(b.title),
      );
  }, [registrations]);

  const resetFilters = () => {
    setQ('');
    setEventId('all');
    setOrganizationId('all');
    setStatus('all');
    setPaymentStatus('all');
    setCheckinStatus('all');
    setSort('newest');
    setPage(1);
  };

  const exportCsv = () => {
    if (!registrations.length) {
      toast.error(
        'There are no registrations to export.',
      );
      return;
    }

    const rows = [
      [
        'Registration ID',
        'Attendee',
        'Email',
        'Event',
        'Organization',
        'Registration Status',
        'Payment Status',
        'Registered At',
        'Ticket Number',
        'Ticket Generated At',
        'Check-in Status',
        'Checked In At',
        'Checked In By',
      ],

      ...registrations.map((registration) => [
        registration.id,
        registration.user_name,
        registration.user_email,
        registration.event_title,
        registration.organization_name,
        registration.registration_status,
        registration.payment_status,
        registration.registered_at,
        registration.ticket?.ticket_number ??
        '',
        registration.ticket?.created_at ??
        '',
        registration.checkin
          ? 'Checked in'
          : 'Not checked in',
        registration.checkin?.checked_in_at ??
        '',
        registration.checkin?.volunteer_name ??
        registration.checkin?.volunteer_email ??
        '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? '').replace(
                /"/g,
                '""',
              )}"`,
          )
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      'eventflow-registrations.csv';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success('CSV exported');
  };

  const canGoPrevious = page > 1;
  const canGoNext =
    pagination.total_pages > 0 &&
    page < pagination.total_pages;

  const showingFrom =
    pagination.total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const showingTo =
    Math.min(
      page * PAGE_SIZE,
      pagination.total,
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Platform operations
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
            Registrations
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Monitor every attendee registration,
            ticket, payment status and check-in across
            the platform.
          </p>
        </div>

        <Button
          variant="secondary"
          leftIcon={
            <Download className="h-4 w-4" />
          }
          onClick={exportCsv}
          disabled={!registrations.length}
        >
          Export CSV
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Total results
            </span>

            <Activity className="h-4 w-4 text-brand-600" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Active
            </span>

            <CheckCircle2 className="h-4 w-4 text-brand-600" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.registered}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Pending
            </span>

            <Clock3 className="h-4 w-4 text-orange-500" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Cancelled
            </span>

            <X className="h-4 w-4 text-red-500" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.cancelled}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Checked in
            </span>

            <CheckCircle2 className="h-4 w-4 text-brand-600" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.checkedIn}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Paid
            </span>

            <CreditCard className="h-4 w-4 text-brand-600" />
          </div>

          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {summary.paid}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
          {/* Search */}
          <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Search className="h-4 w-4 shrink-0 text-ink-400" />

            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Search attendee, email, event, organization or ticket"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
          </div>

          {/* Event */}
          <select
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">
              All events
            </option>

            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.title}
              </option>
            ))}
          </select>

          {/* Organization */}
          <select
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(
                event.target.value,
              );
              setPage(1);
            }}
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">
              All organizations
            </option>

            {organizations.map(
              (organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Registration status */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">
              All registration statuses
            </option>

            <option value="registered">
              Registered
            </option>

            <option value="confirmed">
              Confirmed
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="waitlisted">
              Waitlisted
            </option>

            <option value="waitlist">
              Waitlist
            </option>
          </select>

          {/* Payment */}
          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(
                event.target.value,
              );
              setPage(1);
            }}
            className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">
              All payment statuses
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="unpaid">
              Unpaid
            </option>

            <option value="free">
              Free
            </option>

            <option value="refunded">
              Refunded
            </option>
          </select>

          {/* Check-in */}
          <select
            value={checkinStatus}
            onChange={(event) => {
              setCheckinStatus(
                event.target.value,
              );
              setPage(1);
            }}
            className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">
              All check-ins
            </option>

            <option value="checked_in">
              Checked in
            </option>

            <option value="not_checked_in">
              Not checked in
            </option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(event) => {
              setSort(
                event.target.value as NonNullable<
                  AdminRegistrationFilters['sort']
                >,
              );
              setPage(1);
            }}
            className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>

            <option value="attendee_asc">
              Attendee A–Z
            </option>

            <option value="attendee_desc">
              Attendee Z–A
            </option>

            <option value="event_asc">
              Event A–Z
            </option>

            <option value="event_desc">
              Event Z–A
            </option>

            <option value="checkin_latest">
              Latest check-ins
            </option>
          </select>
        </div>

        {(q ||
          eventId !== 'all' ||
          organizationId !== 'all' ||
          status !== 'all' ||
          paymentStatus !== 'all' ||
          checkinStatus !== 'all' ||
          sort !== 'newest') && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-ink-400">
                Filters applied
              </span>

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Clear filters
              </button>
            </div>
          )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              Registration activity
            </h3>

            <p className="mt-0.5 text-xs text-ink-400">
              Showing {showingFrom}–{showingTo} of{' '}
              {pagination.total}
            </p>
          </div>

          {isFetching && !isLoading && (
            <span className="text-xs text-ink-400">
              Updating…
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                <th className="w-[230px] px-5 py-4">
                  Attendee
                </th>

                <th className="w-[220px] px-4 py-4">
                  Event
                </th>

                <th className="w-[190px] px-4 py-4">
                  Organization
                </th>

                <th className="w-[170px] px-4 py-4">
                  Registered
                </th>

                <th className="w-[150px] px-4 py-4">
                  Payment
                </th>

                <th className="w-[150px] px-4 py-4">
                  Check-in
                </th>

                <th className="w-[150px] px-4 py-4">
                  Ticket
                </th>

                <th className="w-[90px] px-4 py-4">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {isLoading ? (
                Array.from({ length: 7 }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td
                        colSpan={8}
                        className="px-5 py-5"
                      >
                        <Skeleton className="h-12 w-full" />
                      </td>
                    </tr>
                  ),
                )
              ) : registrations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12"
                  >
                    <EmptyState
                      title="No registrations found"
                      description="Try changing your search or filters."
                    />
                  </td>
                </tr>
              ) : (
                registrations.map(
                  (registration) => {
                    const checkedIn =
                      Boolean(
                        registration.checkin,
                      );

                    return (
                      <tr
                        key={registration.id}
                        className="group transition-colors hover:bg-ink-50/70"
                      >
                        {/* Attendee */}
                        <td className="px-5 py-5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                              <User className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-semibold text-ink-900">
                                {registration.user_name ||
                                  'Unknown attendee'}
                              </div>

                              <div className="mt-0.5 truncate text-xs text-ink-500">
                                {registration.user_email ||
                                  '—'}
                              </div>

                              <div className="mt-1">
                                <Badge
                                  tone={getStatusTone(
                                    registration.registration_status,
                                  )}
                                >
                                  {formatLabel(
                                    registration.registration_status,
                                  )}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="px-4 py-5 align-middle">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink-800">
                              {registration.event_title ||
                                'Unknown event'}
                            </div>

                            <div className="mt-1 text-xs text-ink-400">
                              Event #{registration.event_id}
                            </div>
                          </div>
                        </td>

                        {/* Organization */}
                        <td className="px-4 py-5 align-middle">
                          <div className="flex min-w-0 items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-ink-400" />

                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-800">
                                {registration.organization_name ||
                                  'Unknown organization'}
                              </p>

                              <p className="mt-0.5 text-xs text-ink-400">
                                Org #{registration.organization_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Registered */}
                        <td className="px-4 py-5 align-middle">
                          <div>
                            <p className="text-xs font-semibold text-ink-700">
                              {fmtDate(
                                registration.registered_at,
                                'MMM d, yyyy',
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-ink-400">
                              {fmtDate(
                                registration.registered_at,
                                'h:mm a',
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-ink-400">
                              {fmtRelative(
                                registration.registered_at,
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-5 align-middle">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge
                              tone={getPaymentTone(
                                registration.payment_status,
                              )}
                            >
                              {formatLabel(
                                registration.payment_status,
                              )}
                            </Badge>

                            {registration.payment_status ===
                              'paid' && (
                                <span className="text-[11px] text-ink-400">
                                  Payment complete
                                </span>
                              )}
                          </div>
                        </td>

                        {/* Check-in */}
                        <td className="px-4 py-5 align-middle">
                          {checkedIn ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-brand-600" />

                                <span className="text-xs font-semibold text-brand-700">
                                  Checked in
                                </span>
                              </div>

                              <p className="mt-1 text-[11px] text-ink-400">
                                {fmtDate(
                                  registration.checkin!
                                    .checked_in_at,
                                  'MMM d · h:mm a',
                                )}
                              </p>

                              {(registration.checkin!
                                .volunteer_name ||
                                registration.checkin!
                                  .volunteer_email) && (
                                  <p className="mt-1 max-w-[130px] truncate text-[11px] text-ink-400">
                                    by{' '}
                                    {registration.checkin!
                                      .volunteer_name ||
                                      registration.checkin!
                                        .volunteer_email}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Clock3 className="h-4 w-4 text-ink-400" />

                              <span className="text-xs font-medium text-ink-500">
                                Not checked in
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Ticket */}
                        <td className="px-4 py-5 align-middle">
                          {registration.ticket ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Ticket className="h-4 w-4 text-brand-600" />

                                <span className="font-mono text-xs font-semibold text-ink-800">
                                  {registration.ticket
                                    .ticket_number}
                                </span>
                              </div>

                              <p className="mt-1 text-[11px] text-ink-400">
                                {fmtDate(
                                  registration.ticket
                                    .created_at,
                                  'MMM d · h:mm a',
                                )}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-400">
                              No ticket
                            </span>
                          )}
                        </td>

                        {/* View */}
                        <td className="px-4 py-5 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRegistration(
                                registration,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading &&
          pagination.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4">
              <p className="text-xs text-ink-500">
                Showing{' '}
                <span className="font-semibold text-ink-700">
                  {showingFrom}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-ink-700">
                  {showingTo}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-ink-700">
                  {pagination.total}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canGoPrevious}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="px-2 text-xs font-medium text-ink-500">
                  Page {page} of{' '}
                  {Math.max(
                    pagination.total_pages,
                    1,
                  )}
                </span>

                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() =>
                    setPage((current) =>
                      current + 1,
                    )
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Details drawer */}
      {selectedRegistration && (
        <RegistrationDrawer
          registration={
            selectedRegistration
          }
          onClose={() =>
            setSelectedRegistration(null)
          }
        />
      )}
    </div>
  );
}