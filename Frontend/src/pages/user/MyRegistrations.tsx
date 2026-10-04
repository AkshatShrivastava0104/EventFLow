import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Ticket as TicketIcon,
  XCircle,
  Clock3,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';
import { RegistrationsAPI } from '../../lib/queries';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fmtDate, fmtMoney } from '../../lib/utils';
import { resolveMediaUrl } from '../../lib/api';
import toast from 'react-hot-toast';

type Tab = 'upcoming' | 'past' | 'cancelled';

export function MyRegistrations() {
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['my-registrations', user?.id],
    queryFn: () => RegistrationsAPI.list({ user_id: user!.id }),
    enabled: !!user,
  });

  const now = new Date();
  const registrations = data || [];

  const counts = useMemo(() => {
    let upcoming = 0;
    let past = 0;
    let cancelled = 0;

    registrations.forEach((registration) => {
      if (registration.status === 'cancelled') {
        cancelled += 1;
        return;
      }

      if (!registration.event?.start_at) {
        upcoming += 1;
        return;
      }

      const start = new Date(registration.event.start_at);

      if (start >= now) {
        upcoming += 1;
      } else {
        past += 1;
      }
    });

    return {
      upcoming,
      past,
      cancelled,
    };
  }, [registrations, now]);

  const filtered = useMemo(() => {
    return registrations.filter((registration) => {
      if (tab === 'cancelled') {
        return registration.status === 'cancelled';
      }

      if (registration.status === 'cancelled') {
        return false;
      }

      if (!registration.event?.start_at) {
        return tab === 'upcoming';
      }

      const start = new Date(registration.event.start_at);

      if (tab === 'upcoming') {
        return start >= now;
      }

      return start < now;
    });
  }, [registrations, tab, now]);

  const onCancel = async (id: number) => {
    if (
      !confirm(
        'Are you sure you want to cancel this registration? Your ticket will become invalid.'
      )
    ) {
      return;
    }

    try {
      setCancellingId(id);

      await RegistrationsAPI.cancel(id);

      toast.success('Registration cancelled');

      await refetch();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        'Unable to cancel registration. Please try again.'
      );
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusTone = (
    status?: string
  ): 'green' | 'red' | 'orange' | 'gray' => {
    switch (status) {
      case 'registered':
      case 'confirmed':
        return 'green';

      case 'waitlisted':
      case 'waitlist':
      case 'pending':
        return 'orange';

      case 'cancelled':
        return 'red';

      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'registered':
        return 'Registered';

      case 'confirmed':
        return 'Confirmed';

      case 'waitlisted':
      case 'waitlist':
        return 'Waitlisted';

      case 'pending':
        return 'Pending';

      case 'cancelled':
        return 'Cancelled';

      default:
        return status || 'Registered';
    }
  };

  const getPaymentLabel = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';

      case 'unpaid':
        return 'Unpaid';

      case 'refunded':
        return 'Refunded';

      case 'failed':
        return 'Payment failed';

      default:
        return status || 'Free';
    }
  };

  const getPaymentTone = (
    status?: string
  ): 'green' | 'red' | 'orange' | 'gray' => {
    switch (status) {
      case 'paid':
        return 'green';

      case 'failed':
        return 'red';

      case 'refunded':
        return 'orange';

      default:
        return 'gray';
    }
  };

  const getEventImage = (registration: any) => {
    const event = registration?.event;

    const image =
      event?.cover_image ||
      event?.coverImage ||
      event?.cover_url ||
      event?.coverUrl ||
      event?.image_url ||
      event?.imageUrl ||
      event?.image ||
      '';

    return resolveMediaUrl(image);
  };

  return (
    <div className="min-h-screen bg-ink-50/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              <TicketIcon className="h-4 w-4" />
              My tickets
            </div>

            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              My registrations
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500 sm:text-base">
              Manage your event registrations, tickets and upcoming
              experiences from one place.
            </p>
          </div>

          <Link to="/events">
            <Button
              variant="secondary"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Browse events
            </Button>
          </Link>
        </div>

        {/* Summary filters */}
        {!isLoading && registrations.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Upcoming */}
            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={`group rounded-2xl border bg-white p-5 text-left transition-all ${tab === 'upcoming'
                  ? 'border-brand-300 shadow-sm ring-2 ring-brand-100'
                  : 'border-ink-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${tab === 'upcoming'
                      ? 'bg-brand-50 text-brand-600'
                      : 'bg-ink-50 text-ink-500'
                    }`}
                >
                  <Calendar className="h-5 w-5" />
                </div>

                <span className="text-3xl font-semibold tracking-tight text-ink-950">
                  {counts.upcoming}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-900">
                Upcoming events
              </p>

              <p className="mt-1 text-xs text-ink-500">
                Events you can attend
              </p>
            </button>

            {/* Past */}
            <button
              type="button"
              onClick={() => setTab('past')}
              className={`group rounded-2xl border bg-white p-5 text-left transition-all ${tab === 'past'
                  ? 'border-sky-300 shadow-sm ring-2 ring-sky-100'
                  : 'border-ink-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${tab === 'past'
                      ? 'bg-sky-50 text-sky-600'
                      : 'bg-ink-50 text-ink-500'
                    }`}
                >
                  <Clock3 className="h-5 w-5" />
                </div>

                <span className="text-3xl font-semibold tracking-tight text-ink-950">
                  {counts.past}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-900">
                Past events
              </p>

              <p className="mt-1 text-xs text-ink-500">
                Events you registered for
              </p>
            </button>

            {/* Cancelled */}
            <button
              type="button"
              onClick={() => setTab('cancelled')}
              className={`group rounded-2xl border bg-white p-5 text-left transition-all ${tab === 'cancelled'
                  ? 'border-red-300 shadow-sm ring-2 ring-red-100'
                  : 'border-ink-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${tab === 'cancelled'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-ink-50 text-ink-500'
                    }`}
                >
                  <XCircle className="h-5 w-5" />
                </div>

                <span className="text-3xl font-semibold tracking-tight text-ink-950">
                  {counts.cancelled}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-900">
                Cancelled
              </p>

              <p className="mt-1 text-xs text-ink-500">
                Cancelled registrations
              </p>
            </button>
          </div>
        )}

        {/* Registration list */}
        <div className="mt-8 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-ink-200 bg-white p-4"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Skeleton className="h-44 w-full rounded-xl sm:h-32 sm:w-48" />

                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-4 w-full max-w-lg" />
                    <Skeleton className="h-4 w-3/4 max-w-md" />
                  </div>

                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-300 bg-white px-6 py-14">
              <EmptyState
                icon={<TicketIcon className="h-6 w-6" />}
                title={
                  tab === 'cancelled'
                    ? 'No cancelled registrations'
                    : tab === 'past'
                      ? 'No past events'
                      : 'No upcoming registrations'
                }
                description={
                  tab === 'cancelled'
                    ? 'Registrations you cancel will appear here.'
                    : tab === 'past'
                      ? 'Your completed event registrations will appear here.'
                      : 'Once you RSVP to an event, your registration and ticket will appear here.'
                }
                action={
                  <Link to="/events">
                    <Button variant="secondary">Browse events</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            filtered.map((registration) => {
              const event = registration.event;
              const image = getEventImage(registration);

              const isCancelled = registration.status === 'cancelled';
              const isPendingPayment =
                registration.status === 'pending' &&
                registration.payment_status === 'unpaid' &&
                Number(event?.price ?? 0) > 0;

              const startDate = event?.start_at
                ? new Date(event.start_at)
                : null;

              const isPast =
                !!startDate && startDate.getTime() < now.getTime();

              const canCancel =
                !isCancelled &&
                !!startDate &&
                startDate.getTime() > now.getTime();

              const location = [
                event?.venue,
                event?.city,
                event?.country,
              ]
                .filter(Boolean)
                .join(', ');

              const amount = Number(
                registration.total_amount ||
                (Number(event?.price ?? 0) * Number(registration.quantity || 1)),
              );

              return (
                <article
                  key={registration.id}
                  className={`group overflow-hidden rounded-2xl border bg-white transition-all ${isCancelled
                      ? 'border-ink-200 opacity-90'
                      : 'border-ink-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg'
                    }`}
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Cover image */}
                    <div className="relative h-52 w-full shrink-0 overflow-hidden bg-gradient-to-br from-brand-500 via-cyan-500 to-sky-500 lg:h-auto lg:min-h-[210px] lg:w-64">
                      {image ? (
                        <img
                          src={image}
                          alt={event?.title || 'Event cover'}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <TicketIcon className="h-16 w-16 text-white/80" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 pt-16">
                        {event?.category && (
                          <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-800 shadow-sm backdrop-blur">
                            {event.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={getStatusTone(registration.status)}
                              dot
                            >
                              {getStatusLabel(registration.status)}
                            </Badge>

                            <Badge
                              tone={getPaymentTone(
                                registration.payment_status
                              )}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <CreditCard className="h-3 w-3" />
                                {getPaymentLabel(
                                  registration.payment_status
                                )}
                              </span>
                            </Badge>

                            {isPast && !isCancelled && (
                              <Badge tone="gray">Past event</Badge>
                            )}
                          </div>

                          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-950">
                            {event?.title || 'Event'}
                          </h2>

                          <div className="mt-4 grid gap-3 text-sm text-ink-600 sm:grid-cols-2">
                            {event?.start_at && (
                              <div className="flex items-start gap-2">
                                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />

                                <div>
                                  <p className="font-medium text-ink-800">
                                    {fmtDate(event.start_at)}
                                  </p>

                                  {event.end_at && (
                                    <p className="mt-0.5 text-xs text-ink-500">
                                      Until {fmtDate(event.end_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {location && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />

                                <span className="line-clamp-2">
                                  {location}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <TicketIcon className="h-4 w-4 shrink-0 text-brand-600" />

                              <span>
                                {registration.ticket_type ||
                                  'Standard ticket'}{' '}
                                × {registration.quantity || 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 shrink-0 text-brand-600" />

                              <span className="font-medium text-ink-800">
                                {amount > 0
                                  ? fmtMoney(
                                    amount,
                                    event?.currency || 'INR'
                                  )
                                  : 'Free registration'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-xs font-medium text-ink-400">
                            Registration
                          </p>

                          <p className="mt-1 font-mono text-xs text-ink-500">
                            #{registration.id}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-ink-500">
                          {isCancelled ? (
                            <>
                              <CircleAlert className="h-4 w-4 shrink-0 text-red-500" />

                              <span>
                                This registration has been cancelled and its
                                ticket is no longer valid.
                              </span>
                            </>
                          ) : isPendingPayment ? (
                            <>
                              <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" />
                              <span>Payment is pending. Complete checkout to receive your tickets.</span>
                            </>
                          ) : isPast ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-400" />

                              <span>Registration completed</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />

                              <span>Your registration is active</span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isPendingPayment && event?.id && (
                            <Link to={`/events/${event.id}/register`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                rightIcon={<ArrowRight className="h-4 w-4" />}
                              >
                                Complete payment
                              </Button>
                            </Link>
                          )}
                          <Link
                            to={`/registrations/${registration.id}/success`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              rightIcon={
                                <ArrowRight className="h-4 w-4" />
                              }
                            >
                              {isCancelled
                                ? 'View details'
                                : 'View registration'}
                            </Button>
                          </Link>

                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={
                                <XCircle className="h-4 w-4" />
                              }
                              disabled={cancellingId === registration.id}
                              onClick={() => onCancel(registration.id)}
                            >
                              {cancellingId === registration.id
                                ? 'Cancelling...'
                                : 'Cancel'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}