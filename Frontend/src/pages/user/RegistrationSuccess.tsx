import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CheckCircle2,
  Ticket,
  ArrowRight,
  Download,
  Share2,
  Calendar,
  MapPin,
  Clock,
  Users,
  XCircle,
  QrCode,
  ShieldCheck,
  Info,
  ArrowLeft,
} from 'lucide-react';
import {
  RegistrationsAPI,
  TicketsAPI,
  EventsAPI,
} from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import {
  fmtMoney,
} from '../../lib/utils';
import { QRCode } from '../../components/shared/QRCode';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export function RegistrationSuccess() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const toastShown = useRef(false);

  /*
   * Backend currently supports /registrations/me,
   * not GET /registrations/:id.
   */
  const {
    data: registrations,
    isLoading: registrationsLoading,
    isError: registrationsError,
  } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => RegistrationsAPI.list(),
    enabled: !!id,
  });

  const reg = registrations?.find(
    (registration: any) =>
      Number(registration.id) === Number(id),
  );

  const eventId =
    reg?.event_id ??
    reg?.event?.id;

  const {
    data: fetchedEvent,
    isLoading: eventLoading,
  } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () =>
      EventsAPI.get(Number(eventId)),
    enabled: !!eventId && !reg?.event,
  });

  const event =
    reg?.event ?? fetchedEvent;

  /*
   * Registration creation now generates the ticket
   * immediately in the backend transaction.
   */
  const {
    data: tickets,
    isLoading: ticketsLoading,
  } = useQuery({
    queryKey: ['tickets', 'reg', id],
    queryFn: () =>
      TicketsAPI.list({
        registration_id: Number(id),
      }),
    enabled:
      !!id &&
      !!reg &&
      reg.status !== 'cancelled' &&
      reg.status !== 'waitlist',
  });

  /*
   * Fallback only.
   */
  const generateTicket = useMutation({
    mutationFn: () =>
      TicketsAPI.create(Number(id)),

    onSuccess: () => {
      toast.success(
        'Ticket generated successfully!',
      );

      queryClient.invalidateQueries({
        queryKey: ['tickets', 'reg', id],
      });

      queryClient.invalidateQueries({
        queryKey: ['tickets'],
      });

      queryClient.invalidateQueries({
        queryKey: ['my-registrations'],
      });
    },

    onError: (error: any) => {
      const message =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        'Could not generate ticket.';

      toast.error(message);
    },
  });

  /*
   * Cancel registration.
   */
  const cancelRegistration =
    useMutation({
      mutationFn: () =>
        RegistrationsAPI.cancel(
          Number(id),
        ),

      onSuccess: () => {
        toast.success(
          'Registration cancelled successfully.',
        );

        queryClient.invalidateQueries({
          queryKey: ['my-registrations'],
        });

        queryClient.invalidateQueries({
          queryKey: ['tickets'],
        });

        queryClient.invalidateQueries({
          queryKey: ['tickets', 'reg', id],
        });

        queryClient.invalidateQueries({
          queryKey: ['event', eventId],
        });

        if (event?.id) {
          nav(`/events/${event.id}`);
        }
      },

      onError: (error: any) => {
        const message =
          error?.response?.data?.error ??
          error?.response?.data?.message ??
          error?.message ??
          'Could not cancel registration.';

        toast.error(message);
      },
    });

  useEffect(() => {
    /*
     * Prevent duplicate toast in React StrictMode.
     */
    if (
      reg &&
      !toastShown.current
    ) {
      toastShown.current = true;

      if (reg.status === 'waitlist') {
        toast.success(
          "You're on the waitlist!",
        );
      } else if (
        reg.status !== 'cancelled'
      ) {
        toast.success(
          'Registration confirmed!',
        );
      }
    }
  }, [reg]);

  if (
    registrationsLoading ||
    eventLoading ||
    ticketsLoading
  ) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-3xl border border-ink-200 bg-white p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ink-200 border-t-brand-500" />

          <p className="mt-4 text-sm text-ink-500">
            Loading your registration…
          </p>
        </div>
      </div>
    );
  }

  if (
    registrationsError ||
    !reg
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-ink-200 bg-white p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />

          <h1 className="font-display mt-4 text-2xl font-semibold">
            Registration not found
          </h1>

          <p className="mt-2 text-sm text-ink-500">
            We couldn't find this registration
            in your account.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/my-registrations">
              <Button variant="secondary">
                My registrations
              </Button>
            </Link>

            <Link to="/events">
              <Button variant="outline">
                Browse events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-ink-200 bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-500" />

          <h1 className="font-display mt-4 text-2xl font-semibold">
            Registration confirmed
          </h1>

          <p className="mt-2 text-sm text-ink-500">
            Your registration was created
            successfully, but event details
            could not be loaded.
          </p>

          <div className="mt-6">
            <Link to="/my-registrations">
              <Button
                variant="secondary"
                rightIcon={
                  <ArrowRight className="h-4 w-4" />
                }
              >
                View my registrations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled =
    String(reg.status).toLowerCase() ===
    'cancelled';

  const isWaitlist =
    String(reg.status).toLowerCase() ===
    'waitlist' ||
    String(reg.status).toLowerCase() ===
    'waitlisted';

  /*
   * Backend can expose event timestamps as:
   * start_at / end_at
   * OR
   * start_time / end_time
   *
   * Registration nested event currently comes
   * directly from the backend event fields.
   */
  const eventData = event as any;

  const eventStart =
    eventData.start_at ??
    eventData.start_time ??
    eventData.startAt ??
    '';

  const eventEnd =
    eventData.end_at ??
    eventData.end_time ??
    eventData.endAt ??
    '';

  /*
   * datetime-local values are intended to represent
   * the exact local date/time entered by the organizer.
   *
   * Reading UTC components prevents the browser from
   * adding India's +5:30 offset again.
   */
  const formatEventDate = (
    value: string,
  ): string => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      },
    ).format(date);
  };

  const formatEventTime = (
    value: string,
  ): string => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      },
    ).format(date);
  };

  const startDate = formatEventDate(
    eventStart,
  );

  const startTime = formatEventTime(
    eventStart,
  );

  const endDate = formatEventDate(
    eventEnd,
  );

  const endTime = formatEventTime(
    eventEnd,
  );

  const sameDate =
    eventStart &&
    eventEnd &&
    startDate === endDate;

  const dateDisplay = eventStart
    ? startDate
    : 'Date not available';

  let timeDisplay = 'Time not available';

  if (eventStart && eventEnd) {
    if (sameDate) {
      timeDisplay =
        `${startTime} – ${endTime}`;
    } else {
      timeDisplay =
        `${startTime} – ${endDate} ${endTime}`;
    }
  } else if (eventStart) {
    timeDisplay = startTime;
  }

  /*
   * Ticket is valid only while registration is active.
   */
  const activeTickets =
    !isWaitlist &&
      !isCancelled &&
      Array.isArray(tickets)
      ? tickets
      : [];

  const ticket =
    activeTickets.length > 0
      ? activeTickets[0]
      : null;

  /*
   * Backend ticket normalization may expose:
   * ticket_number, ticket_code or qr_code.
   */
  const ticketNumber =
    ticket?.ticket_number ??
    ticket?.ticket_code ??
    ticket?.qr_code ??
    '';

  const qrValue =
    ticket?.qr_code ??
    ticket?.ticket_code ??
    ticket?.ticket_number ??
    '';

  const qrCodeUrl =
    ticket?.qr_code_url ??
    '';

  const currency =
    eventData.currency ||
    'INR';

  const handleCancel = () => {
    if (
      isCancelled ||
      cancelRegistration.isPending
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this registration? You can register again later if spots are available.',
    );

    if (!confirmed) {
      return;
    }

    cancelRegistration.mutate();
  };

  const handleGenerateTicket = () => {
    if (
      ticket ||
      isCancelled ||
      isWaitlist ||
      generateTicket.isPending
    ) {
      return;
    }

    generateTicket.mutate();
  };

  const handleShare = async () => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.share
      ) {
        await navigator.share({
          title: event.title,
          text: `My registration for ${event.title}`,
          url: window.location.href,
        });

        return;
      }

      if (
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          window.location.href,
        );

        toast.success(
          'Registration link copied',
        );
      }
    } catch {
      /*
       * User cancelled native share.
       */
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

      {/* Back Navigation */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() =>
            nav('/my-registrations')
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 transition hover:text-ink-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my registrations
        </button>
      </div>

      {/* Confirmation Header */}
      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="text-center"
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isCancelled
            ? 'bg-red-100 text-red-600'
            : isWaitlist
              ? 'bg-orange-100 text-orange-600'
              : 'bg-brand-100 text-brand-600'
            }`}
        >
          {isCancelled ? (
            <XCircle className="h-8 w-8" />
          ) : (
            <CheckCircle2 className="h-8 w-8" />
          )}
        </div>

        <h1 className="font-display mt-4 text-4xl font-semibold">
          {isCancelled
            ? 'Registration cancelled'
            : isWaitlist
              ? "You're on the waitlist"
              : "You're going!"}
        </h1>

        <p className="mx-auto mt-2 max-w-2xl text-ink-600">
          {isCancelled
            ? 'Your registration and its ticket are no longer valid. You can register again from the event page.'
            : isWaitlist
              ? `We'll notify ${reg.user_email} if a spot opens up for ${event.title}.`
              : `Your registration for ${event.title} is confirmed and your ticket is ready.`}
        </p>
      </motion.div>

      {/* Event Card */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-sm">

        {/* Event Header */}
        <div className="bg-ink-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${isCancelled
                ? 'bg-red-500/20 text-red-300'
                : isWaitlist
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'bg-brand-500/20 text-brand-300'
                }`}
            >
              {isCancelled
                ? 'Cancelled'
                : isWaitlist
                  ? 'Waitlist'
                  : 'Confirmed'}
            </span>

            {event.category && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-ink-200">
                {event.category}
              </span>
            )}
          </div>

          <h2 className="font-display mt-4 text-3xl font-semibold sm:text-4xl">
            {event.title}
          </h2>

          <p className="mt-2 text-sm text-ink-300">
            Registration #{reg.id}
          </p>
        </div>

        {/* Event Information */}
        <div className="grid gap-4 border-b border-ink-100 p-6 sm:grid-cols-2 lg:grid-cols-4">

          <InfoItem
            icon={
              <Calendar className="h-5 w-5" />
            }
            label="Date"
            value={dateDisplay}
          />

          <InfoItem
            icon={
              <Clock className="h-5 w-5" />
            }
            label="Time"
            value={timeDisplay}
          />

          <InfoItem
            icon={
              <MapPin className="h-5 w-5" />
            }
            label="Venue"
            value={
              event.venue ||
              event.city ||
              'Event venue'
            }
          />

          <InfoItem
            icon={
              <Users className="h-5 w-5" />
            }
            label="Attendee"
            value={
              reg.user_name ||
              'Registered attendee'
            }
          />
        </div>

        {/* Registration Details */}
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Registration details
            </h3>

            <div className="mt-4 space-y-3 text-sm">
              <Row
                label="Attendee"
                value={
                  reg.user_name ||
                  'Registered attendee'
                }
              />

              <Row
                label="Email"
                value={
                  reg.user_email ||
                  '—'
                }
              />

              <Row
                label="Ticket type"
                value={`${reg.ticket_type || 'General'} × ${reg.quantity || 1}`}
              />

              <Row
                label="Payment"
                value={
                  reg.payment_status ===
                    'free' ||
                    reg.payment_status ===
                    'unpaid'
                    ? 'Free'
                    : reg.payment_status ||
                    'Free'
                }
              />

              <Row
                label="Total"
                value={
                  reg.payment_status ===
                    'free' ||
                    Number(
                      reg.total_amount || 0,
                    ) === 0
                    ? 'Free'
                    : fmtMoney(
                      Number(
                        reg.total_amount,
                      ),
                      currency,
                    )
                }
              />
            </div>
          </div>

          {/* Ticket */}
          {!isCancelled &&
            !isWaitlist && (
              <div className="rounded-2xl bg-ink-50 p-5">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-brand-600" />

                  <h3 className="font-display text-lg font-semibold">
                    Your event ticket
                  </h3>
                </div>

                {ticket ? (
                  <div className="mt-5 flex flex-col items-center">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <QRCode
                        value={
                          qrValue ||
                          ticketNumber
                        }
                        qrCodeUrl={qrCodeUrl}
                        size={180}
                      />
                    </div>

                    {ticketNumber && (
                      <p className="mt-3 font-mono text-sm font-semibold text-ink-900">
                        {ticketNumber}
                      </p>
                    )}

                    <p className="mt-1 text-center text-xs text-ink-500">
                      Keep this QR code ready
                      when you arrive at the
                      event.
                    </p>

                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="mt-4"
                    >
                      <Button
                        variant="secondary"
                        leftIcon={
                          <Ticket className="h-4 w-4" />
                        }
                      >
                        Open ticket
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="rounded-xl border border-dashed border-ink-300 bg-white p-5 text-center">
                      <QrCode className="mx-auto h-10 w-10 text-ink-400" />

                      <p className="mt-3 text-sm font-semibold text-ink-900">
                        Ticket not generated yet
                      </p>

                      <p className="mt-1 text-xs text-ink-500">
                        Generate your QR ticket
                        before attending the
                        event.
                      </p>

                      <Button
                        className="mt-4"
                        variant="secondary"
                        loading={
                          generateTicket.isPending
                        }
                        onClick={
                          handleGenerateTicket
                        }
                        leftIcon={
                          <QrCode className="h-4 w-4" />
                        }
                      >
                        Generate ticket
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Important Ticket Information */}
        {!isCancelled &&
          !isWaitlist && (
            <div className="mx-6 mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />

                <div>
                  <h3 className="font-semibold text-ink-900">
                    How to use your ticket
                  </h3>

                  <p className="mt-1 text-sm leading-relaxed text-ink-700">
                    When you arrive at the event,
                    show this QR code to the
                    organizer or staff at the
                    check-in desk. They will scan
                    your QR ticket to verify your
                    registration and mark you as
                    checked in.
                  </p>

                  <div className="mt-3 flex gap-2 text-xs text-ink-600">
                    <Info className="h-4 w-4 shrink-0 text-brand-600" />

                    <span>
                      Keep your ticket accessible
                      on your phone. You don't need
                      to print it.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Cancelled State */}
        {isCancelled && (
          <div className="mx-6 mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h3 className="font-semibold text-red-900">
                  Registration cancelled
                </h3>

                <p className="mt-1 text-sm leading-relaxed text-red-700">
                  This registration and its ticket
                  are no longer valid. If the event
                  still has availability, you can
                  register again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50 p-5">
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/events/${event.id}`}
            >
              <Button
                variant="outline"
                leftIcon={
                  <ArrowRight className="h-4 w-4" />
                }
              >
                Event details
              </Button>
            </Link>

            <Button
              variant="outline"
              leftIcon={
                <Share2 className="h-4 w-4" />
              }
              onClick={handleShare}
            >
              Share
            </Button>

            {ticket && !isCancelled && (
              <Button
                variant="outline"
                leftIcon={
                  <Download className="h-4 w-4" />
                }
                onClick={() =>
                  toast.success(
                    'Ticket download will be available soon.',
                  )
                }
              >
                Download ticket
              </Button>
            )}

            {isCancelled && (
              <Link
                to={`/events/${event.id}/register`}
              >
                <Button
                  variant="secondary"
                  leftIcon={
                    <ArrowRight className="h-4 w-4" />
                  }
                >
                  Register again
                </Button>
              </Link>
            )}
          </div>

          {!isCancelled &&
            !isWaitlist && (
              <Button
                variant="outline"
                loading={
                  cancelRegistration.isPending
                }
                onClick={handleCancel}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel registration
              </Button>
            )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-ink-500">
        <Link
          to="/events"
          className="hover:text-ink-900"
        >
          Browse more events
        </Link>

        <span>•</span>

        <Link
          to="/my-registrations"
          className="text-brand-600 hover:underline"
        >
          My registrations
        </Link>

        {ticket && !isCancelled && (
          <>
            <span>•</span>

            <Link
              to={`/tickets/${ticket.id}`}
              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            >
              <Ticket className="h-3.5 w-3.5" />
              Open ticket
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-ink-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink-500">
        {label}
      </span>

      <span className="text-right font-semibold text-ink-900">
        {value}
      </span>
    </div>
  );
}