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
  ShieldCheck,
} from 'lucide-react';
import {
  EventsAPI,
  RegistrationsAPI,
} from '../../lib/queries';
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
    isLoading,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => EventsAPI.get(id!),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setName(displayName || '');
    }
  }, [user, displayName]);

  const isFree =
    !event ||
    Number(event.price || 0) === 0;

  const register = useMutation({
    mutationFn: () =>
      RegistrationsAPI.create({
        event_id: event!.id,
        user_id: user?.id != null ? String(user.id) : undefined,
        user_name: name,
        user_email: email,
        user_phone: phone,

        /*
         * The backend currently treats a normal free RSVP
         * as one registration and immediately creates its
         * ticket.
         */
        ticket_type: 'General',
        quantity: 1,
        total_amount: 0,
        payment_status: 'free',
      }),

    onSuccess: (response: any) => {
      /*
       * Normal free registration response:
       *
       * {
       *   message: "registration created successfully",
       *   registration_id: 123
       * }
       *
       * Waitlist response:
       *
       * {
       *   message: "...",
       *   waitlist_id: 123
       * }
       */

      const registrationId =
        response?.registration_id ??
        response?.registration?.id ??
        response?.data?.registration_id ??
        response?.data?.registration?.id;

      const waitlistId =
        response?.waitlist_id ??
        response?.waitlist?.id ??
        response?.data?.waitlist_id ??
        response?.data?.waitlist?.id;

      if (isWaitlist) {
        toast.success(
          'You have joined the waitlist!',
        );

        if (waitlistId) {
          nav(
            `/registrations/${waitlistId}/success`,
          );
        } else {
          nav('/registrations');
        }

        return;
      }

      if (registrationId) {
        toast.success(
          'Registration successful! Your ticket is ready.',
        );

        nav(
          `/registrations/${registrationId}/success`,
        );

        return;
      }

      toast.success(
        'Registration successful! Your ticket is ready.',
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

      if (
        error?.response?.status === 400
      ) {
        toast.error(
          backendMessage ||
          'Registration is not available for this event.',
        );

        return;
      }

      if (
        error?.response?.status === 401
      ) {
        toast.error(
          'Please sign in to register.',
        );

        nav('/login', {
          state: {
            from: `/events/${id}/register`,
          },
        });

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

    /*
     * Payment is intentionally not wired yet.
     *
     * Free RSVP:
     * Register immediately -> backend creates
     * registration + ticket atomically.
     *
     * Paid events:
     * Keep existing checkout flow for now.
     */
    if (isFree || isWaitlist) {
      register.mutate();
      return;
    }

    sessionStorage.setItem(
      'ef.checkout',
      JSON.stringify({
        event_id: event.id,
        name,
        email,
        phone,
        qty: 1,
        ticket_type: 'General',
        total: Number(event.price),
      }),
    );

    nav(
      `/events/${event.id}/checkout`,
    );
  };

  if (isLoading || !event) {
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
              Registration
            </h2>

            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="font-semibold text-brand-900">
                General admission
              </p>

              <p className="mt-1 text-sm text-brand-700">
                {isWaitlist
                  ? 'You will be added to the event waitlist.'
                  : 'One registration includes one digital ticket.'}
              </p>

              <p className="mt-2 text-sm font-semibold text-brand-900">
                {isFree
                  ? 'Free'
                  : fmtMoney(
                    Number(event.price),
                    event.currency || 'INR',
                  )}
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
                  ? 'RSVP now'
                  : 'Continue to payment'}
            </Button>
          </div>
        </form>

        <OrderSummary
          event={event}
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
  isFree,
}: {
  event: any;
  isFree: boolean;
}) {
  const price = Number(
    event?.price || 0,
  );

  const currency =
    event?.currency || 'INR';

  return (
    <aside className="h-fit rounded-2xl border border-ink-200 bg-white p-5 lg:sticky lg:top-20">
      {event?.cover_image ? (
        <img
          src={event.cover_image}
          alt={event.title}
          className="aspect-video w-full rounded-xl object-cover"
        />
      ) : (
        <div className="aspect-video rounded-xl bg-gradient-to-br from-brand-500 to-sky-500" />
      )}

      <h3 className="font-display mt-3 text-lg font-semibold">
        {event.title}
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        {fmtDate(event.start_at)} •{' '}
        {event.venue}, {event.city}
      </p>

      <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
        <Row
          label="General admission"
          value={
            isFree
              ? 'Free'
              : fmtMoney(
                price,
                currency,
              )
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
            : fmtMoney(
              price,
              currency,
            )}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600">
        <ShieldCheck className="h-4 w-4 text-brand-600" />

        Secure registration. Your digital
        ticket is generated immediately.
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