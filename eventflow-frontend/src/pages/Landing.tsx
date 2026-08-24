import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomePath } from '@/routes/ProtectedRoute';

const TIERS = [
  {
    icon: ShieldCheck,
    name: 'Owner',
    tag: 'Platform super-admin',
    desc: 'A birds-eye console over every organization, user and event. Monitor platform growth, adoption and system health in real time.',
    points: ['All organizations & users', 'Platform-wide analytics', 'Live system health'],
    accent: 'from-ink-800 to-ink-950 text-white',
  },
  {
    icon: LayoutDashboard,
    name: 'Organization',
    tag: 'Team workspace',
    desc: 'Everything your team needs to run events: create and publish, manage members, track registrations and check attendees in.',
    points: ['Events lifecycle & attendees', 'Member roles & permissions', 'On-site check-in'],
    accent: 'from-accent-500 to-accent-700 text-white',
  },
  {
    icon: Ticket,
    name: 'Attendee',
    tag: 'Your events',
    desc: 'Discover events, register in a tap and keep every ticket with its QR code in one tidy wallet — with reminders along the way.',
    points: ['Browse & register', 'QR tickets wallet', 'Notifications'],
    accent: 'from-success-500 to-success-700 text-white',
  },
];

const FEATURES = [
  { icon: CalendarCheck2, title: 'Full event lifecycle', desc: 'Draft, publish, cancel and complete events with capacity and deadlines.' },
  { icon: Users, title: 'Roles that fit', desc: 'Owners, admins, members and volunteers each get the right access.' },
  { icon: QrCode, title: 'Fast check-in', desc: 'Scan or key in ticket numbers to admit attendees in seconds.' },
  { icon: BarChart3, title: 'Analytics built in', desc: 'Registration trends and check-in rates, no spreadsheets required.' },
];

export function Landing() {
  const { isAuthenticated } = useAuth();
  const home = useHomePath();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={home}>
                <Button>
                  Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent-100/60 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            One platform · three tailored experiences
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Events, from oversight to on-site.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500">
            EventFlow gives platform owners, organizing teams and attendees each a
            purpose-built experience — under one roof, in real time.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to={isAuthenticated ? home : '/register'}>
              <Button size="lg">
                {isAuthenticated ? 'Go to dashboard' : 'Get started free'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app">
              <Button size="lg" variant="outline">
                Browse events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three experiences */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Built for every role
          </h2>
          <p className="mt-2 text-ink-500">
            No compromise dashboards. Each tier sees exactly what it needs.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map(({ icon: Icon, name, tag, desc, points, accent }) => (
            <div
              key={name}
              className="flex flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-soft transition hover:shadow-pop"
            >
              <span
                className={`mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                {tag}
              </p>
              <h3 className="text-lg font-semibold text-ink-900">{name}</h3>
              <p className="mt-2 text-sm text-ink-500">{desc}</p>
              <ul className="mt-4 space-y-2">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-ink-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-ink-200 bg-white p-5 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-50 text-accent-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-8 py-14 text-center text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-600/40 blur-3xl"
            aria-hidden="true"
          />
          <h2 className="relative text-3xl font-semibold tracking-tight">
            Ready to run your next event?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-ink-300">
            Create an account and set up your organization in minutes.
          </p>
          <div className="relative mt-8">
            <Link to={isAuthenticated ? home : '/register'}>
              <Button size="lg" variant="secondary">
                {isAuthenticated ? 'Go to dashboard' : 'Create your account'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} EventFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
