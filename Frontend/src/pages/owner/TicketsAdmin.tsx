import {
  useMemo,
  useState,
} from 'react';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Ticket,
  UserRound,
  X,
  Building2,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  AdminAPI,
  EventsAPI,
} from '../../lib/queries';

import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

type TicketRow = {
  id: number | string;

  ticket_number?: string;
  ticket_code?: string;
  qr_code?: string;

  user_id?: number | string;
  user_name?: string;
  user_email?: string;

  attendee_name?: string;
  attendee_email?: string;

  event_id?: number | string;
  event_title?: string;

  organization_id?: number | string;
  organization_name?: string;

  registration_id?: number | string;
  registration_status?: string;
  payment_status?: string;
  registered_at?: string;
  created_at?: string;

  ticket?: {
    id?: number | string;
    ticket_number?: string;
    qr_code?: string;
    created_at?: string;
  } | null;

  checkin?: {
    id?: number | string;
    ticket_id?: number | string;
    volunteer_id?: number | string;
    volunteer_name?: string;
    volunteer_email?: string;
    checked_in_at?: string;
  } | null;

  activity?: {
    type?: string;
    label?: string;
    occurred_at?: string;
    description?: string;
  }[];

  checked_in?: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type RegistrationResponse = {
  registrations?: TicketRow[];
  pagination?: Pagination;
};

type Organization = {
  id: number | string;
  name: string;
};

type SortValue =
  | 'newest'
  | 'oldest'
  | 'attendee_asc'
  | 'attendee_desc'
  | 'event_asc'
  | 'event_desc'
  | 'checkin_latest';

const PAGE_SIZE = 25;

function normalizeRows(
  response: RegistrationResponse | TicketRow[] | undefined,
): TicketRow[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.registrations ?? [];
}

function getPagination(
  response: RegistrationResponse | undefined,
  page: number,
): Pagination {
  return (
    response?.pagination ?? {
      page,
      limit: PAGE_SIZE,
      total: 0,
      total_pages: 1,
    }
  );
}

function getTicketNumber(ticket: TicketRow) {
  return (
    ticket.ticket?.ticket_number ||
    ticket.ticket_number ||
    ticket.ticket_code ||
    `#${ticket.id}`
  );
}

function getAttendeeName(ticket: TicketRow) {
  return (
    ticket.user_name ||
    ticket.attendee_name ||
    'Unknown attendee'
  );
}

function getAttendeeEmail(ticket: TicketRow) {
  return (
    ticket.user_email ||
    ticket.attendee_email ||
    '—'
  );
}

function getEventTitle(ticket: TicketRow) {
  return (
    ticket.event_title ||
    'Unknown event'
  );
}

function getOrganizationName(ticket: TicketRow) {
  return (
    ticket.organization_name ||
    'Unknown organization'
  );
}

function isCheckedIn(ticket: TicketRow) {
  return Boolean(
    ticket.checkin ||
    ticket.checked_in,
  );
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function formatShortDate(
  value?: string,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

function getRegistrationStatus(
  ticket: TicketRow,
) {
  return (
    ticket.registration_status ||
    'unknown'
  ).toLowerCase();
}

function getPaymentStatus(
  ticket: TicketRow,
) {
  return (
    ticket.payment_status ||
    'unknown'
  ).toLowerCase();
}

function getStatusTone(
  status: string,
): 'green' | 'gray' | 'yellow' | 'red' {
  switch (status.toLowerCase()) {
    case 'registered':
    case 'paid':
    case 'checked_in':
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

export function TicketsAdmin() {
  const [search, setSearch] =
    useState('');

  const [eventId, setEventId] =
    useState('');

  const [organizationId, setOrganizationId] =
    useState('');

  const [registrationStatus, setRegistrationStatus] =
    useState('');

  const [paymentStatus, setPaymentStatus] =
    useState('');

  const [checkinStatus, setCheckinStatus] =
    useState<
      '' | 'checked_in' | 'not_checked_in'
    >('');

  const [fromDate, setFromDate] =
    useState('');

  const [toDate, setToDate] =
    useState('');

  const [sort, setSort] =
    useState<SortValue>('newest');

  const [page, setPage] =
    useState(1);

  const [selectedTicket, setSelectedTicket] =
    useState<TicketRow | null>(null);

  const [showFilters, setShowFilters] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  /*
   * Events
   */
  const {
    data: eventsResponse,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['events', 'owner-ticket-console'],
    queryFn: () => EventsAPI.list(),
    staleTime: 60_000,
  });

  const events = Array.isArray(eventsResponse)
    ? eventsResponse
    : [];

  /*
   * Organizations
   */
  const {
    data: organizationsResponse,
    isLoading: organizationsLoading,
  } = useQuery({
    queryKey: [
      'platform-organizations',
      'ticket-console',
    ],
    queryFn: () =>
      AdminAPI.listOrganizations({
        page: 1,
        limit: 100,
      }),
    staleTime: 60_000,
  });

  const organizations: Organization[] =
    organizationsResponse?.organizations ??
    [];

  /*
   * Tickets / registrations
   *
   * Platform-owner endpoint gives us:
   * attendee + event + organization +
   * registration + ticket + check-in +
   * persisted activity.
   */
  const {
    data: registrationsResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'owner',
      'tickets',
      {
        search,
        eventId,
        organizationId,
        registrationStatus,
        paymentStatus,
        checkinStatus,
        fromDate,
        toDate,
        sort,
        page,
      },
    ],

    queryFn: () =>
      AdminAPI.listRegistrations({
        search: search.trim() || undefined,

        event_id:
          eventId || undefined,

        organization_id:
          organizationId || undefined,

        status:
          registrationStatus || undefined,

        payment_status:
          paymentStatus || undefined,

        checkin:
          checkinStatus || undefined,

        from:
          fromDate
            ? new Date(
              `${fromDate}T00:00:00`,
            ).toISOString()
            : undefined,

        to:
          toDate
            ? new Date(
              `${toDate}T23:59:59.999`,
            ).toISOString()
            : undefined,

        sort,

        page,

        limit: PAGE_SIZE,
      }),

    staleTime: 15_000,

    refetchInterval: 30_000,
  });

  const rows = useMemo(
    () =>
      normalizeRows(
        registrationsResponse,
      ).filter(
        (ticket) =>
          Boolean(
            ticket.ticket ||
            ticket.ticket_number ||
            ticket.ticket_code,
          ),
      ),
    [registrationsResponse],
  );

  const pagination = getPagination(
    registrationsResponse,
    page,
  );

  /*
   * Page-level operational metrics.
   *
   * These are based on the tickets returned for
   * the current filtered page.
   */
  const metrics = useMemo(() => {
    const total = rows.length;

    const checkedIn = rows.filter(
      isCheckedIn,
    ).length;

    const awaiting = rows.filter(
      (ticket) =>
        !isCheckedIn(ticket),
    ).length;

    const paid = rows.filter(
      (ticket) =>
        getPaymentStatus(ticket) ===
        'paid',
    ).length;

    const pendingPayment = rows.filter(
      (ticket) =>
        getPaymentStatus(ticket) ===
        'unpaid',
    ).length;

    const cancelled = rows.filter(
      (ticket) =>
        getRegistrationStatus(ticket) ===
        'cancelled',
    ).length;

    const checkinRate =
      total > 0
        ? Math.round(
          (checkedIn / total) * 100,
        )
        : 0;

    return {
      total,
      checkedIn,
      awaiting,
      paid,
      pendingPayment,
      cancelled,
      checkinRate,
    };
  }, [rows]);

  const resetFilters = () => {
    setSearch('');
    setEventId('');
    setOrganizationId('');
    setRegistrationStatus('');
    setPaymentStatus('');
    setCheckinStatus('');
    setFromDate('');
    setToDate('');
    setSort('newest');
    setPage(1);
  };

  const hasFilters =
    Boolean(
      search ||
      eventId ||
      organizationId ||
      registrationStatus ||
      paymentStatus ||
      checkinStatus ||
      fromDate ||
      toDate,
    );

  const copyTicketNumber = async (
    ticket: TicketRow,
  ) => {
    const value =
      getTicketNumber(ticket);

    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(true);

      toast.success(
        'Ticket number copied.',
      );

      window.setTimeout(
        () => setCopied(false),
        1500,
      );
    } catch {
      toast.error(
        'Unable to copy ticket number.',
      );
    }
  };

  const exportCSV = () => {
    if (!rows.length) {
      toast.error(
        'There are no tickets to export.',
      );
      return;
    }

    const headers = [
      'Ticket',
      'Attendee',
      'Email',
      'Event',
      'Organization',
      'Registration Status',
      'Payment Status',
      'Check-in Status',
      'Checked-in At',
      'Checked-in By',
      'Ticket Created At',
    ];

    const escapeCSV = (
      value: unknown,
    ) => {
      const stringValue =
        String(value ?? '');

      return `"${stringValue.replace(
        /"/g,
        '""',
      )}"`;
    };

    const lines = [
      headers.map(escapeCSV).join(','),
    ];

    rows.forEach((ticket) => {
      lines.push(
        [
          getTicketNumber(ticket),
          getAttendeeName(ticket),
          getAttendeeEmail(ticket),
          getEventTitle(ticket),
          getOrganizationName(ticket),
          getRegistrationStatus(ticket),
          getPaymentStatus(ticket),
          isCheckedIn(ticket)
            ? 'checked_in'
            : 'not_checked_in',
          ticket.checkin?.checked_in_at ||
          '',
          ticket.checkin?.volunteer_name ||
          '',
          ticket.ticket?.created_at ||
          ticket.created_at ||
          '',
        ]
          .map(escapeCSV)
          .join(','),
      );
    });

    const blob = new Blob(
      [lines.join('\n')],
      {
        type: 'text/csv;charset=utf-8;',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;

    anchor.download = `eventflow-tickets-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success(
      'Ticket CSV exported.',
    );
  };

  const previousPage = () => {
    setPage((current) =>
      Math.max(1, current - 1),
    );
  };

  const nextPage = () => {
    setPage((current) =>
      Math.min(
        pagination.total_pages || 1,
        current + 1,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
            <Ticket className="h-3.5 w-3.5" />
            Owner console
          </div>

          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
            Tickets & check-in
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Monitor platform tickets, attendance,
            payment state and check-in activity from
            one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={
              <Download className="h-4 w-4" />
            }
            onClick={exportCSV}
            disabled={!rows.length}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={
              <RefreshCw
                className={`h-4 w-4 ${isFetching
                  ? 'animate-spin'
                  : ''
                  }`}
              />
            }
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* =====================================================
          KPI
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={
            <Ticket className="h-4 w-4" />
          }
          label="Tickets"
          value={
            metrics.total
          }
          hint="Matching filters"
        />

        <MetricCard
          icon={
            <CheckCircle2 className="h-4 w-4" />
          }
          label="Checked in"
          value={
            metrics.checkedIn
          }
          hint="Current page"
        />

        <MetricCard
          icon={
            <Clock3 className="h-4 w-4" />
          }
          label="Awaiting"
          value={
            metrics.awaiting
          }
          hint="Current page"
        />

        <MetricCard
          icon={
            <CircleDollarSign className="h-4 w-4" />
          }
          label="Paid"
          value={
            metrics.paid
          }
          hint="Current page"
        />

        <MetricCard
          icon={
            <CreditCard className="h-4 w-4" />
          }
          label="Unpaid"
          value={
            metrics.pendingPayment
          }
          hint="Current page"
        />

        <MetricCard
          icon={
            <Activity className="h-4 w-4" />
          }
          label="Check-in rate"
          value={`${metrics.checkinRate}%`}
          hint="Current page"
        />
      </div>

      {/* =====================================================
          SEARCH + QUICK FILTERS
      ===================================================== */}

      <div className="rounded-2xl border border-ink-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
                setPage(1);
              }}
              placeholder="Search ticket, attendee, email, event or organization..."
              className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="rounded-md p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={eventId}
            onChange={(event) => {
              setEventId(
                event.target.value,
              );
              setPage(1);
            }}
            disabled={eventsLoading}
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">
              All events
            </option>

            {events.map(
              (event: any) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.title}
                </option>
              ),
            )}
          </select>

          <select
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(
                event.target.value,
              );
              setPage(1);
            }}
            disabled={
              organizationsLoading
            }
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setShowFilters(
                (value) => !value,
              )
            }
            leftIcon={
              <Filter className="h-4 w-4" />
            }
          >
            Filters
            {hasFilters && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-ink-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Registration"
              value={
                registrationStatus
              }
              onChange={(value) => {
                setRegistrationStatus(
                  value,
                );
                setPage(1);
              }}
              options={[
                {
                  value: '',
                  label: 'All statuses',
                },
                {
                  value: 'registered',
                  label: 'Registered',
                },
                {
                  value: 'pending',
                  label: 'Pending',
                },
                {
                  value: 'cancelled',
                  label: 'Cancelled',
                },
              ]}
            />

            <FilterSelect
              label="Payment"
              value={paymentStatus}
              onChange={(value) => {
                setPaymentStatus(
                  value,
                );
                setPage(1);
              }}
              options={[
                {
                  value: '',
                  label: 'All payments',
                },
                {
                  value: 'paid',
                  label: 'Paid',
                },
                {
                  value: 'unpaid',
                  label: 'Unpaid',
                },
              ]}
            />

            <FilterSelect
              label="Check-in"
              value={checkinStatus}
              onChange={(value) => {
                setCheckinStatus(
                  value as
                  | ''
                  | 'checked_in'
                  | 'not_checked_in',
                );
                setPage(1);
              }}
              options={[
                {
                  value: '',
                  label: 'All check-ins',
                },
                {
                  value: 'checked_in',
                  label: 'Checked in',
                },
                {
                  value:
                    'not_checked_in',
                  label:
                    'Not checked in',
                },
              ]}
            />

            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => {
                setSort(
                  value as SortValue,
                );
                setPage(1);
              }}
              options={[
                {
                  value: 'newest',
                  label: 'Newest first',
                },
                {
                  value: 'oldest',
                  label: 'Oldest first',
                },
                {
                  value:
                    'attendee_asc',
                  label:
                    'Attendee A–Z',
                },
                {
                  value:
                    'attendee_desc',
                  label:
                    'Attendee Z–A',
                },
                {
                  value: 'event_asc',
                  label:
                    'Event A–Z',
                },
                {
                  value:
                    'event_desc',
                  label:
                    'Event Z–A',
                },
                {
                  value:
                    'checkin_latest',
                  label:
                    'Latest check-in',
                },
              ]}
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">
                Registered from
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(
                    event.target.value,
                  );
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">
                Registered to
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(
                    event.target.value,
                  );
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!hasFilters}
                onClick={
                  resetFilters
                }
              >
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div>
            <p className="font-semibold">
              Unable to load tickets
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Please refresh and try again.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* =====================================================
          DESKTOP TABLE
      ===================================================== */}

      <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm lg:block">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">
              Ticket directory
            </p>

            <p className="text-xs text-ink-500">
              {pagination.total}{' '}
              matching tickets
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-400">
            {isFetching && (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-ink-50 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">
                  Ticket
                </th>

                <th className="px-4 py-3">
                  Attendee
                </th>

                <th className="px-4 py-3">
                  Event
                </th>

                <th className="px-4 py-3">
                  Organization
                </th>

                <th className="px-4 py-3">
                  Registration
                </th>

                <th className="px-4 py-3">
                  Payment
                </th>

                <th className="px-4 py-3">
                  Check-in
                </th>

                <th className="px-4 py-3">
                  Checked in at
                </th>

                <th className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {isLoading ? (
                Array.from({
                  length: 8,
                }).map((_, index) => (
                  <tr key={index}>
                    <td
                      colSpan={9}
                      className="px-4 py-3"
                    >
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8"
                  >
                    <EmptyState
                      icon={
                        <Ticket className="h-5 w-5" />
                      }
                      title="No tickets found"
                      description={
                        hasFilters
                          ? 'Try changing your filters or search.'
                          : 'No tickets have been issued yet.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map(
                  (ticket) => {
                    const checkedIn =
                      isCheckedIn(
                        ticket,
                      );

                    const registration =
                      getRegistrationStatus(
                        ticket,
                      );

                    const payment =
                      getPaymentStatus(
                        ticket,
                      );

                    return (
                      <tr
                        key={
                          ticket.id
                        }
                        className="group transition hover:bg-ink-50/70"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTicket(
                                ticket,
                              )
                            }
                            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                          >
                            {getTicketNumber(
                              ticket,
                            )}
                          </button>

                          <p className="mt-1 text-[11px] text-ink-400">
                            {formatShortDate(
                              ticket.ticket
                                ?.created_at ||
                              ticket.created_at,
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                              <UserRound className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">
                                {getAttendeeName(
                                  ticket,
                                )}
                              </p>

                              <p className="truncate text-xs text-ink-500">
                                {getAttendeeEmail(
                                  ticket,
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="max-w-[190px] truncate font-medium text-ink-800">
                            {getEventTitle(
                              ticket,
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-ink-600">
                            <Building2 className="h-3.5 w-3.5 text-ink-400" />
                            <span className="max-w-[150px] truncate">
                              {getOrganizationName(
                                ticket,
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            tone={getStatusTone(
                              registration,
                            )}
                            dot
                          >
                            {registration.replace(
                              /_/g,
                              ' ',
                            )}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            tone={getStatusTone(
                              payment,
                            )}
                            dot
                          >
                            {payment.replace(
                              /_/g,
                              ' ',
                            )}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            tone={
                              checkedIn
                                ? 'green'
                                : 'gray'
                            }
                            dot
                          >
                            {checkedIn
                              ? 'Checked in'
                              : 'Awaiting'}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 text-xs text-ink-500">
                          {formatDate(
                            ticket.checkin
                              ?.checked_in_at,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTicket(
                                  ticket,
                                )
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-xs font-medium text-ink-700 hover:bg-white"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>


                          </div>
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
            <PaginationBar
              pagination={
                pagination
              }
              onPrevious={
                previousPage
              }
              onNext={nextPage}
            />
          )}
      </div>

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-ink-200 bg-white p-4"
            >
              <Skeleton className="h-24 w-full" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 bg-white p-8">
            <EmptyState
              icon={
                <Ticket className="h-5 w-5" />
              }
              title="No tickets found"
              description={
                hasFilters
                  ? 'Try changing your filters.'
                  : 'No tickets have been issued yet.'
              }
            />
          </div>
        ) : (
          rows.map((ticket) => {
            const checkedIn =
              isCheckedIn(ticket);

            return (
              <div
                key={ticket.id}
                className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTicket(
                          ticket,
                        )
                      }
                      className="font-mono text-sm font-semibold text-brand-700"
                    >
                      {getTicketNumber(
                        ticket,
                      )}
                    </button>

                    <p className="mt-1 font-semibold text-ink-900">
                      {getAttendeeName(
                        ticket,
                      )}
                    </p>

                    <p className="text-xs text-ink-500">
                      {getAttendeeEmail(
                        ticket,
                      )}
                    </p>
                  </div>

                  <Badge
                    tone={
                      checkedIn
                        ? 'green'
                        : 'gray'
                    }
                    dot
                  >
                    {checkedIn
                      ? 'Checked in'
                      : 'Awaiting'}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
                  <InfoItem
                    label="Event"
                    value={getEventTitle(
                      ticket,
                    )}
                  />

                  <InfoItem
                    label="Organization"
                    value={getOrganizationName(
                      ticket,
                    )}
                  />

                  <InfoItem
                    label="Registration"
                    value={getRegistrationStatus(
                      ticket,
                    ).replace(
                      /_/g,
                      ' ',
                    )}
                  />

                  <InfoItem
                    label="Payment"
                    value={getPaymentStatus(
                      ticket,
                    ).replace(
                      /_/g,
                      ' ',
                    )}
                  />

                  <InfoItem
                    label="Checked in"
                    value={formatDate(
                      ticket.checkin
                        ?.checked_in_at,
                    )}
                  />

                  <InfoItem
                    label="Created"
                    value={formatDate(
                      ticket.ticket
                        ?.created_at ||
                      ticket.created_at,
                    )}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTicket(
                        ticket,
                      )
                    }
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 text-xs font-medium text-ink-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View details
                  </button>

                </div>
              </div>
            );
          })
        )}

        {!isLoading &&
          pagination.total > 0 && (
            <div className="rounded-2xl border border-ink-200 bg-white">
              <PaginationBar
                pagination={
                  pagination
                }
                onPrevious={
                  previousPage
                }
                onNext={nextPage}
              />
            </div>
          )}
      </div>

      {/* =====================================================
          DETAILS DRAWER
      ===================================================== */}

      {selectedTicket && (
        <TicketDetailsDrawer
          ticket={
            selectedTicket
          }
          copied={copied}
          onCopy={() =>
            copyTicketNumber(
              selectedTicket,
            )
          }
          onClose={() =>
            setSelectedTicket(
              null,
            )
          }
        />
      )}
    </div>
  );
}

/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-ink-500">
        {label}
      </p>

      <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] text-ink-400">
        {hint}
      </p>
    </div>
  );
}

/* ============================================================
   FILTER SELECT
============================================================ */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-500">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-10 w-full appearance-none rounded-lg border border-ink-200 bg-white px-3 pr-9 text-sm outline-none focus:border-brand-400"
        >
          {options.map(
            (option) => (
              <option
                key={option.value}
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium capitalize text-ink-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PAGINATION
============================================================ */

function PaginationBar({
  pagination,
  onPrevious,
  onNext,
}: {
  pagination: Pagination;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const totalPages =
    Math.max(
      1,
      pagination.total_pages ||
      1,
    );

  return (
    <div className="flex flex-col gap-3 border-t border-ink-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-500">
        Page{' '}
        <span className="font-semibold text-ink-800">
          {pagination.page}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-ink-800">
          {totalPages}
        </span>{' '}
        ·{' '}
        {pagination.total}{' '}
        total
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={
            pagination.page <= 1
          }
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 px-2.5 text-xs font-medium text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={
            pagination.page >=
            totalPages
          }
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 px-2.5 text-xs font-medium text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DETAILS DRAWER
============================================================ */

function TicketDetailsDrawer({
  ticket,
  copied,
  onCopy,
  onClose,
}: {
  ticket: TicketRow;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const checkedIn =
    isCheckedIn(ticket);

  const activity =
    ticket.activity ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close ticket details"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Ticket details
            </p>

            <div className="mt-1 flex items-center gap-2">
              <h3 className="font-mono text-lg font-semibold text-ink-900">
                {getTicketNumber(
                  ticket,
                )}
              </h3>

              <button
                type="button"
                onClick={onCopy}
                className="rounded-md p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                title="Copy ticket number"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            {/* Status */}
            <div className="flex flex-wrap gap-2">
              <Badge
                tone={
                  checkedIn
                    ? 'green'
                    : 'gray'
                }
                dot
              >
                {checkedIn
                  ? 'Checked in'
                  : 'Awaiting check-in'}
              </Badge>

              <Badge
                tone={getStatusTone(
                  getRegistrationStatus(
                    ticket,
                  ),
                )}
                dot
              >
                {getRegistrationStatus(
                  ticket,
                ).replace(
                  /_/g,
                  ' ',
                )}
              </Badge>

              <Badge
                tone={getStatusTone(
                  getPaymentStatus(
                    ticket,
                  ),
                )}
                dot
              >
                {getPaymentStatus(
                  ticket,
                ).replace(
                  /_/g,
                  ' ',
                )}
              </Badge>
            </div>

            {/* Attendee */}
            <DetailSection
              icon={
                <UserRound className="h-4 w-4" />
              }
              title="Attendee"
            >
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                <p className="font-semibold text-ink-900">
                  {getAttendeeName(
                    ticket,
                  )}
                </p>

                <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                  <Mail className="h-3.5 w-3.5" />
                  {getAttendeeEmail(
                    ticket,
                  )}
                </div>
              </div>
            </DetailSection>

            {/* Event */}
            <DetailSection
              icon={
                <CalendarDays className="h-4 w-4" />
              }
              title="Event"
            >
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="font-semibold text-ink-900">
                  {getEventTitle(
                    ticket,
                  )}
                </p>

                <p className="mt-1 text-xs text-ink-500">
                  {getOrganizationName(
                    ticket,
                  )}
                </p>
              </div>
            </DetailSection>

            {/* Ticket */}
            <DetailSection
              icon={
                <Ticket className="h-4 w-4" />
              }
              title="Ticket"
            >
              <div className="grid gap-4 rounded-xl border border-ink-100 p-4 sm:grid-cols-2">
                <DetailValue
                  label="Ticket number"
                  value={getTicketNumber(
                    ticket,
                  )}
                />

                <DetailValue
                  label="Ticket ID"
                  value={
                    ticket.ticket
                      ?.id
                      ? String(
                        ticket.ticket.id,
                      )
                      : String(
                        ticket.id,
                      )
                  }
                />

                <DetailValue
                  label="Created"
                  value={formatDate(
                    ticket.ticket
                      ?.created_at ||
                    ticket.created_at,
                  )}
                />

                <DetailValue
                  label="Registration"
                  value={
                    ticket.registration_id
                      ? String(
                        ticket.registration_id,
                      )
                      : '—'
                  }
                />
              </div>
            </DetailSection>

            {/* Check-in */}
            <DetailSection
              icon={
                <ShieldCheck className="h-4 w-4" />
              }
              title="Check-in"
            >
              <div className="rounded-xl border border-ink-100 p-4">
                {checkedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Attendee checked in
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailValue
                        label="Checked in at"
                        value={formatDate(
                          ticket
                            .checkin
                            ?.checked_in_at,
                        )}
                      />

                      <DetailValue
                        label="Checked in by"
                        value={
                          ticket
                            .checkin
                            ?.volunteer_name ||
                          '—'
                        }
                      />

                      <DetailValue
                        label="Staff email"
                        value={
                          ticket
                            .checkin
                            ?.volunteer_email ||
                          '—'
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                      <Clock3 className="h-4 w-4 text-ink-400" />
                      Awaiting check-in
                    </div>

                    <p className="mt-1 text-xs text-ink-500">
                      This ticket has not been
                      checked in yet.
                    </p>

                  </div>
                )}
              </div>
            </DetailSection>

            {/* Activity */}
            <DetailSection
              icon={
                <Activity className="h-4 w-4" />
              }
              title="Activity"
            >
              {activity.length > 0 ? (
                <div className="space-y-0">
                  {activity.map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        key={`${item.type}-${item.occurred_at}-${index}`}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {index <
                          activity.length -
                          1 && (
                            <span className="absolute left-[7px] top-5 h-full w-px bg-ink-200" />
                          )}

                        <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-400 bg-white" />

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-800">
                            {item.label ||
                              item.type ||
                              'Activity'}
                          </p>

                          {item.description && (
                            <p className="mt-0.5 text-xs text-ink-500">
                              {
                                item.description
                              }
                            </p>
                          )}

                          <p className="mt-1 text-[11px] text-ink-400">
                            {formatDate(
                              item.occurred_at,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-ink-200 p-4 text-xs text-ink-500">
                  No activity timeline is
                  available for this ticket.
                </div>
              )}
            </DetailSection>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 bg-white px-5 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   DETAIL SECTION
============================================================ */

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-brand-600">
          {icon}
        </span>

        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {title}
        </h4>
      </div>

      {children}
    </section>
  );
}

/* ============================================================
   DETAIL VALUE
============================================================ */

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-medium text-ink-800">
        {value}
      </p>
    </div>
  );
}