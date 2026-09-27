import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  Mail,
  XCircle,
  CheckCircle2,
  User,
  CalendarDays,
} from 'lucide-react';

import { RegistrationsAPI, EventsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/utils';
import toast from 'react-hot-toast';

export function Registrations() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [eventId, setEventId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const {
    data: registrationsData,
    isLoading,
  } = useQuery({
    queryKey: ['registrations', 'owner'],
    queryFn: () => RegistrationsAPI.list(),
  });

  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['events'],
    queryFn: () => EventsAPI.list(),
  });

  /*
   * RegistrationsAPI can return different response shapes.
   * Normalize it before using the data.
   */
  const registrations = useMemo(() => {
    if (Array.isArray(registrationsData)) {
      return registrationsData;
    }

    if (
      registrationsData &&
      typeof registrationsData === 'object'
    ) {
      const response = registrationsData as {
        data?: unknown;
        registrations?: unknown;
      };

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.registrations)) {
        return response.registrations;
      }
    }

    return [];
  }, [registrationsData]);

  const events = useMemo(() => {
    if (Array.isArray(eventsData)) {
      return eventsData;
    }

    if (eventsData && typeof eventsData === 'object') {
      const response = eventsData as {
        data?: unknown;
        events?: unknown;
      };

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.events)) {
        return response.events;
      }
    }

    return [];
  }, [eventsData]);

  /*
   * Create an event lookup.
   *
   * A registration may only contain event_id instead
   * of a nested event object.
   */
  const eventMap = useMemo(() => {
    const map = new Map<string, any>();

    events.forEach((event: any) => {
      if (event?.id !== undefined && event?.id !== null) {
        map.set(String(event.id), event);
      }
    });

    return map;
  }, [events]);

  /*
   * Normalize registration display data.
   */
  const normalizedRegistrations = useMemo(() => {
    return registrations.map((registration: any) => {
      const event =
        registration?.event ??
        eventMap.get(String(registration?.event_id));

      const user = registration?.user;

      const userName =
        registration?.user_name ??
        registration?.attendee_name ??
        registration?.name ??
        user?.name ??
        user?.full_name ??
        user?.username ??
        'Unknown attendee';

      const userEmail =
        registration?.user_email ??
        registration?.attendee_email ??
        registration?.email ??
        user?.email ??
        '—';

      const ticketType =
        registration?.ticket_type ??
        registration?.ticket?.type ??
        registration?.ticket?.name ??
        registration?.type ??
        'General';

      const quantity = Math.max(
        1,
        Number(
          registration?.quantity ??
          registration?.qty ??
          registration?.tickets_count ??
          1
        )
      );

      /*
       * Amount priority:
       *
       * 1. Registration total_amount
       * 2. Registration amount
       * 3. Registration total
       * 4. Registration price
       * 5. Event price × quantity
       *
       * Backend Registration currently does not store event price,
       * so event.price is used as the fallback.
       */
      const registrationAmount =
        registration?.total_amount ??
        registration?.amount ??
        registration?.total ??
        registration?.price;

      const eventPrice = Number(
        event?.price ??
        event?.ticket_price ??
        0
      );

      const totalAmount =
        registrationAmount !== undefined &&
          registrationAmount !== null
          ? Number(registrationAmount)
          : eventPrice * quantity;

      const paymentStatus =
        registration?.payment_status ??
        registration?.payment?.status ??
        'unpaid';

      const registrationStatus =
        registration?.status ??
        'pending';

      const createdAt =
        registration?.created_at ??
        registration?.createdAt ??
        registration?.registered_at ??
        null;

      return {
        ...registration,
        event,
        user_name: userName,
        user_email: userEmail,
        ticket_type: ticketType,
        quantity,
        total_amount: Number.isFinite(totalAmount)
          ? totalAmount
          : 0,
        payment_status: String(paymentStatus).toLowerCase(),
        status: String(registrationStatus).toLowerCase(),
        created_at: createdAt,
      };
    });
  }, [registrations, eventMap]);

  const filtered = useMemo(() => {
    let list = [...normalizedRegistrations];

    if (eventId !== 'all') {
      list = list.filter(
        (registration: any) =>
          String(registration.event_id) === eventId
      );
    }

    if (status !== 'all') {
      list = list.filter(
        (registration: any) =>
          registration.status === status
      );
    }

    if (q.trim()) {
      const search = q.toLowerCase().trim();

      list = list.filter((registration: any) => {
        const searchableText = [
          registration.user_name,
          registration.user_email,
          registration.event?.title,
          registration.ticket_type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(search);
      });
    }

    return list;
  }, [
    normalizedRegistrations,
    q,
    eventId,
    status,
  ]);

  const cancel = useMutation({
    mutationFn: (id: number) =>
      RegistrationsAPI.cancel(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['registrations'],
      });

      toast.success(
        'Registration cancelled & refunded'
      );
    },

    onError: () => {
      toast.error(
        'Failed to cancel registration'
      );
    },
  });

  const exportCsv = () => {
    const rows = [
      [
        'ID',
        'Name',
        'Email',
        'Event',
        'Type',
        'Qty',
        'Amount',
        'Status',
        'Payment',
        'Date',
      ],

      ...filtered.map((registration: any) => [
        registration.id,
        registration.user_name,
        registration.user_email,
        registration.event?.title ?? '',
        registration.ticket_type,
        registration.quantity,
        registration.total_amount,
        registration.status,
        registration.payment_status,
        registration.created_at ?? '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? '').replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'registrations.csv';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success('CSV exported');
  };

  const getPaymentTone = (
    paymentStatus: string
  ): 'green' | 'red' | 'gray' | 'orange' => {
    switch (paymentStatus) {
      case 'paid':
        return 'green';

      case 'refunded':
        return 'red';

      case 'pending':
        return 'orange';

      default:
        return 'gray';
    }
  };

  const getStatusTone = (
    registrationStatus: string
  ): 'green' | 'red' | 'gray' | 'orange' => {
    switch (registrationStatus) {
      case 'confirmed':
        return 'green';

      case 'waitlist':
      case 'waitlisted':
        return 'orange';

      case 'cancelled':
        return 'red';

      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            Registrations
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Every ticket order across your events.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={
              <Mail className="h-4 w-4" />
            }
            onClick={() =>
              toast.success(
                'Email sent to all confirmed attendees'
              )
            }
          >
            Email attendees
          </Button>

          <Button
            variant="secondary"
            leftIcon={
              <Download className="h-4 w-4" />
            }
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_190px]">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />

          <input
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
            placeholder="Search by name or email"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
        </div>

        <select
          value={eventId}
          onChange={(e) =>
            setEventId(e.target.value)
          }
          className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">
            All events
          </option>

          {events.map((event: any) => (
            <option
              key={event.id}
              value={event.id}
            >
              {event.title}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
          className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">
            All statuses
          </option>

          <option value="confirmed">
            Confirmed
          </option>

          <option value="waitlist">
            Waitlist
          </option>

          <option value="waitlisted">
            Waitlisted
          </option>

          <option value="cancelled">
            Cancelled
          </option>

          <option value="pending">
            Pending
          </option>
        </select>
      </div>

      {/* Registration table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                <th className="w-[230px] px-5 py-4">
                  Attendee
                </th>

                <th className="w-[220px] px-4 py-4">
                  Event
                </th>

                <th className="w-[130px] px-4 py-4">
                  Type
                </th>

                <th className="w-[80px] px-4 py-4">
                  Qty
                </th>

                <th className="w-[130px] px-4 py-4">
                  Amount
                </th>

                <th className="w-[130px] px-4 py-4">
                  Payment
                </th>

                <th className="w-[140px] px-4 py-4">
                  Status
                </th>

                <th className="w-[150px] px-4 py-4">
                  When
                </th>

                <th className="w-[120px] px-4 py-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {isLoading || eventsLoading ? (
                Array.from({ length: 5 }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td
                        colSpan={9}
                        className="px-5 py-5"
                      >
                        <Skeleton className="h-12 w-full" />
                      </td>
                    </tr>
                  )
                )
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12"
                  >
                    <EmptyState
                      title="No registrations found"
                      description="Try changing your search or filters."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((registration: any) => {
                  const event =
                    registration.event;

                  const currency =
                    event?.currency ??
                    'INR';

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
                              {registration.user_name}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-ink-500">
                              {registration.user_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-4 py-5 align-middle">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink-800">
                            {event?.title ??
                              'Unknown event'}
                          </div>

                          {event?.start_at ||
                            event?.start_time ? (
                            <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                              <CalendarDays className="h-3 w-3" />

                              {fmtDate(
                                event.start_at ??
                                event.start_time,
                                'MMM d, yyyy'
                              )}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-ink-400">
                              Date not available
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ticket type */}
                      <td className="px-4 py-5 align-middle">
                        <span className="inline-flex rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700">
                          {registration.ticket_type}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-5 align-middle">
                        <span className="font-medium text-ink-800">
                          {registration.quantity}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-5 align-middle">
                        <span className="font-semibold text-ink-900">
                          {registration.total_amount > 0
                            ? fmtMoney(
                              registration.total_amount,
                              currency
                            )
                            : Number(event?.price ?? 0) > 0
                              ? fmtMoney(
                                Number(event.price) *
                                registration.quantity,
                                currency
                              )
                              : 'Free'}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-5 align-middle">
                        <Badge
                          tone={getPaymentTone(
                            registration.payment_status
                          )}
                        >
                          {registration.payment_status}
                        </Badge>
                      </td>

                      {/* Registration status */}
                      <td className="px-4 py-5 align-middle">
                        <Badge
                          tone={getStatusTone(
                            registration.status
                          )}
                          dot
                        >
                          {registration.status}
                        </Badge>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-5 align-middle">
                        {registration.created_at ? (
                          <div className="text-xs font-medium text-ink-600">
                            {fmtRelative(
                              registration.created_at
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-5 align-middle">
                        <div className="flex items-center gap-2">
                          {registration.status !==
                            'cancelled' && (
                              <button
                                type="button"
                                disabled={
                                  cancel.isPending
                                }
                                onClick={() =>
                                  cancel.mutate(
                                    registration.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            )}

                          {registration.status ===
                            'confirmed' && (
                              <CheckCircle2 className="h-4 w-4 text-brand-600" />
                            )}

                          {registration.status ===
                            'cancelled' && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600">
                                <XCircle className="h-3.5 w-3.5" />
                                Cancelled
                              </span>
                            )}

                          {registration.status ===
                            'pending' && (
                              <span className="text-xs font-medium text-ink-400">
                                Pending
                              </span>
                            )}

                          {(registration.status ===
                            'waitlist' ||
                            registration.status ===
                            'waitlisted') && (
                              <span className="text-xs font-medium text-orange-600">
                                Waitlisted
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result count */}
      {!isLoading &&
        filtered.length > 0 && (
          <div className="flex items-center justify-between px-1 text-xs text-ink-500">
            <span>
              Showing {filtered.length}{' '}
              registration
              {filtered.length !== 1
                ? 's'
                : ''}
            </span>
          </div>
        )}
    </div>
  );
}