import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  BarChart3,
  Ticket,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function OrganizersLanding() {
  const { role } = useAuth();

  const tiers = [
    {
      name: 'Starter',
      price: 'Free',
      desc: 'For community meetups',
      features: [
        'Up to 100 attendees / event',
        'QR check-in on any device',
        'Basic analytics',
        'Email notifications',
      ],
    },
    {
      name: 'Growth',
      price: '₹6,499 /mo',
      desc: 'For clubs & studios',
      highlight: true,
      features: [
        'Unlimited attendees',
        'Custom branding',
        'Staff roles & permissions',
        'Waitlists & discount codes',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Talk to us',
      desc: 'For festivals & venues',
      features: [
        'SSO & audit logs',
        'Dedicated CSM',
        'On-site staff training',
        'Custom integrations',
        'SLA & DPA',
      ],
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-0 bg-grid opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              For organizers
            </p>

            <h1 className="font-display mt-2 text-5xl font-semibold leading-tight sm:text-6xl">
              Sell more tickets. Sweat less on setup.
            </h1>

            <p className="mt-4 text-lg text-ink-600">
              Publish beautiful event pages, take payments, and manage
              attendees end-to-end — with tools designed for real ops teams.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/organizers/start?plan=starter"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink-900 px-6 font-semibold text-white"
              >
                {role === 'user' ? 'Become an organizer' : 'Start free'}
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Platform Owner ONLY */}
              {role === 'owner' && (
                <Link
                  to="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-200 px-6 font-semibold text-ink-900"
                >
                  Owner Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Ticket,
              t: 'Sell tickets in minutes',
              d: 'Free, paid, tiered, timed — with Stripe or Razorpay payouts.',
            },
            {
              icon: BarChart3,
              t: 'Analytics that matter',
              d: 'Track sales velocity, no-show rates and repeat attendees.',
            },
            {
              icon: ShieldCheck,
              t: 'Team-ready',
              d: 'Invite admins and door staff with fine-grained permissions.',
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-ink-200 bg-white p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                <f.icon className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-display text-xl font-semibold">
                {f.t}
              </h3>

              <p className="mt-2 text-sm text-ink-500">
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          Pricing
        </p>

        <h2 className="font-display text-4xl font-semibold">
          Simple, per-organization pricing
        </h2>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-6 ${t.highlight
                  ? 'border-ink-900 bg-ink-950 text-white shadow-xl'
                  : 'border-ink-200 bg-white'
                }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-widest ${t.highlight
                    ? 'text-brand-300'
                    : 'text-brand-600'
                  }`}
              >
                {t.name}
              </p>

              <p
                className={`font-display mt-2 text-4xl font-semibold ${t.highlight
                    ? 'text-white'
                    : 'text-ink-900'
                  }`}
              >
                {t.price}
              </p>

              <p
                className={`mt-1 text-sm ${t.highlight
                    ? 'text-ink-300'
                    : 'text-ink-500'
                  }`}
              >
                {t.desc}
              </p>

              <ul
                className={`mt-6 space-y-2 text-sm ${t.highlight
                    ? 'text-ink-200'
                    : 'text-ink-700'
                  }`}
              >
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2"
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 ${t.highlight
                          ? 'text-brand-300'
                          : 'text-brand-600'
                        }`}
                    />

                    {f}
                  </li>
                ))}
              </ul>

              {t.name === 'Enterprise' ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-ink-100 font-semibold text-ink-500"
                >
                  Coming soon
                </button>
              ) : (
                <Link
                  to={`/organizers/start?plan=${t.name === 'Growth' ? 'growth' : 'starter'}`}
                  className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold ${t.highlight
                      ? 'bg-brand-500 text-white hover:bg-brand-600'
                      : 'bg-ink-900 text-white hover:bg-ink-800'
                    }`}
                >
                  {t.name === 'Growth' ? 'Choose Growth' : 'Start free'}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}