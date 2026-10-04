import { useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  User as UserIcon,
  Mail,
  Phone,
  Ticket as TicketIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  EventsAPI,
  RegistrationsAPI,
} from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  fmtDate,
  fmtMoney,
} from '../../lib/utils';
import toast from 'react-hot-toast';

export function RegisterEvent() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const isWaitlist =
    params.get('waitlist') === '1';

  const {
    user,
    displayName,
  } = useAuth();

  const {
    data: event,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => EventsAPI.get(id!),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qty, setQty] = useState(1);
  const [ticketType, setTicketType] =
    useState('General');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setName(displayName || '');
    }
  }, [user, displayName]);

  const isFree =
    !event ||
    Number(event.price || 0) === 0;

  const totalAmount = isFree
    ? 0
    : Number(event!.price) * qty;

  const register = useMutation({
    mutationFn: (payload: any) =>
      RegistrationsAPI.create(payload),

    onSuccess: (response: any) => {
      /*
       * Backend response can be one of these shapes:
       *
       * {
       *   registration: {
       *     id: 123
       *   }
       * }
       *
       * OR
       *
       * {
       *   registration_id: 123
       * }
       *
       * OR directly:
       *
       * {
       *   id: 123
       * }
       *
       * Handle all of them so the frontend
       * never crashes on registration.id.
       */

      const registration =
        response?.registration ??
        response?.data?.registration ??
        response;

      const registrationId =
        registration?.id ??
        response?.registration_id ??
        response?.data?.registration_id ??
        registration?.registration_id;

      if (registrationId) {
        toast.success(
          isWaitlist
            ? 'You have joined the waitlist!'
            : 'Registration successful!',
        );

        nav(
          `/registrations/${registrationId}/success`,
        );

        return;
      }

      /*
       * Registration succeeded but backend did not
       * return an ID.
       *
       * Do not crash the UI. Send the user to
       * their registrations page instead.
       */
      toast.success(
        isWaitlist
          ? 'You have joined the waitlist!'
          : 'Registration successful!',
      );

      nav('/registrations');
    },

    onError: (error: any) => {
      const backendMessage =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message;

      if (
        error?.response?.status === 409
      ) {
        toast.error(
          backendMessage ||
          'You are already registered for this event.',
        );

        return;
      }

      toast.error(
        backendMessage ||
        'Registration failed. Please try again.',
      );
    },
  });

  const proceed = (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!event) {
      return;
    }

    if (!user) {
      toast.error(
        'Please sign in to register',
      );

      nav('/login', {
        state: {
          from: `/events/${id}/register`,
        },
      });

      return;
    }

    if (isFree || isWaitlist) {
      register.mutate({
        event_id: event.id,

        /*
         * Keep user_id for compatibility with the
         * existing backend. The backend should still
         * trust the authenticated JWT user_id rather
         * than this client-provided value.
         */
        user_id: user.id,

        user_name: name,
        user_email: email,
        user_phone: phone,

        ticket_type: ticketType,
        quantity: qty,

        total_amount: 0,
        payment_status: 'free',

        status: isWaitlist
          ? 'waitlist'
          : undefined,
      });

      return;
    }

    /*
     * Paid event:
     * Persist checkout state and move to
     * payment page.
     */
    sessionStorage.setItem(
      'ef.checkout',
      JSON.stringify({
        event_id: event.id,
        name,
        email,
        phone,
        qty,
        ticket_type: ticketType,
        total: totalAmount,
      }),
    );

    nav(
      `/events/${event.id}/checkout`,
    );
  };

  if (!event) {
    return (
      <div className="p-10 text-center text-ink-500">
        Loading event…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => nav(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <Stepper
        current={1}
        isFree={isFree || isWaitlist}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={proceed}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold">
              Attendee details
            </h2>

            <p className="mt-1 text-sm text-ink-500">
              This information will appear on
              your ticket.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                icon={
                  <UserIcon className="h-4 w-4" />
                }
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

              <Input
                label="Email"
                icon={
                  <Mail className="h-4 w-4" />
                }
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <Input
                label="Phone (optional)"
                icon={
                  <Phone className="h-4 w-4" />
                }
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold">
              Ticket selection
            </h2>

            <div className="mt-4 space-y-3">
              {['General', 'VIP'].map(
                (tt) => (
                  <label
                    key={tt}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${ticketType === tt
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-ink-200'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="ticket"
                        checked={
                          ticketType === tt
                        }
                        onChange={() =>
                          setTicketType(tt)
                        }
                        className="accent-brand-500"
                      />

                      <div>
                        <p className="font-semibold">
                          {tt} ticket
                        </p>

                        <p className="text-xs text-ink-500">
                          {tt === 'VIP'
                            ? 'Front row + backstage lounge'
                            : 'Standard admission'}
                        </p>
                      </div>
                    </div>

                    <p className="font-display text-lg font-semibold">
                      {isFree
                        ? 'Free'
                        : fmtMoney(Number(event.price))}
                    </p>
                  </label>
                ),
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-semibold">
                Quantity
              </label>

              <div className="inline-flex items-center rounded-lg border border-ink-200">
                <button
                  type="button"
                  onClick={() =>
                    setQty((q) =>
                      Math.max(1, q - 1),
                    )
                  }
                  className="h-9 w-9 text-lg"
                >
                  –
                </button>

                <span className="w-10 text-center text-sm font-semibold">
                  {qty}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQty((q) =>
                      Math.min(10, q + 1),
                    )
                  }
                  className="h-9 w-9 text-lg"
                >
                  +
                </button>
              </div>

              <p className="text-xs text-ink-500">
                Max 10 per order
              </p>
            </div>
          </div>

          {isWaitlist && (
            <div className="flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              <Info className="h-5 w-5 shrink-0" />

              <span>
                This event is currently at
                capacity. You'll be added to
                the waitlist and notified if a
                spot opens up.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              By continuing you accept the
              EventFlow Terms of Service and
              event-specific rules.
            </p>

            <Button
              type="submit"
              size="lg"
              variant="secondary"
              rightIcon={
                <ArrowRight className="h-4 w-4" />
              }
              loading={register.isPending}
            >
              {isWaitlist
                ? 'Join waitlist'
                : isFree
                  ? 'Reserve free spot'
                  : 'Continue to payment'}
            </Button>
          </div>
        </form>

        <OrderSummary
          event={event}
          qty={qty}
          ticketType={ticketType}
          total={totalAmount}
          isFree={isFree || isWaitlist}
        />
      </div>
    </div>
  );
}

export function Stepper({
  current,
  isFree,
}: {
  current: 1 | 2 | 3;
  isFree?: boolean;
}) {
  const steps = isFree
    ? ['Details', 'Confirm']
    : ['Details', 'Payment', 'Confirm'];

  return (
    <div className="flex items-center gap-3 text-sm">
      {steps.map((step, index) => {
        const active =
          index + 1 === current;

        const done =
          index + 1 < current;

        return (
          <div
            key={step}
            className="flex items-center gap-3"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done
                ? 'bg-brand-500 text-white'
                : active
                  ? 'bg-ink-900 text-white'
                  : 'bg-ink-100 text-ink-500'
                }`}
            >
              {index + 1}
            </div>

            <span
              className={
                active
                  ? 'font-semibold text-ink-900'
                  : 'text-ink-500'
              }
            >
              {step}
            </span>

            {index <
              steps.length - 1 && (
                <div className="h-px w-8 bg-ink-200" />
              )}
          </div>
        );
      })}
    </div>
  );
}

export function OrderSummary({
  event,
  qty,
  ticketType,
  total,
  isFree,
}: any) {
  const mediaUrl = resolveMediaUrl(
    event?.cover_image ||
    event?.cover_media_url ||
    '',
  );

  return (
    <aside className="h-fit rounded-2xl border border-ink-200 bg-white p-5 lg:sticky lg:top-20">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-sky-500">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={event?.title || 'Event cover'}
            className="h-full w-full object-cover"
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </div>

      <h3 className="font-display mt-3 text-lg font-semibold">
        {event.title}
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        {fmtDate(event.start_at)} •{' '}
        {event.venue}, {event.city}
      </p>

      <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
        <Row
          label={`${ticketType} × ${qty}`}
          value={
            isFree
              ? 'Free'
              : fmtMoney(total)
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-4">
        <p className="text-sm font-semibold">
          Total
        </p>

        <p className="font-display text-2xl font-semibold">
          {isFree
            ? 'Free'
            : fmtMoney(total)}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600">
        <ShieldCheck className="h-4 w-4 text-brand-600" />

        Sandbox payment simulation · No real charges
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-500">
        {label}
      </span>

      <span className="font-semibold text-ink-900">
        {value}
      </span>
    </div>
  );
}

// Also export a small link used in
// the empty checkout page
export function BackToEvent({
  id,
}: {
  id: number;
}) {
  return (
    <Link
      className="text-sm text-brand-600"
      to={`/events/${id}`}
    >
      ← Back to event
    </Link>
  );
}