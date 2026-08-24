import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, ShieldCheck, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: 'Platform-wide control for owners' },
  { icon: Users, text: 'Team workspaces for organizations' },
  { icon: CalendarCheck2, text: 'Effortless registration for attendees' },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-600/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden="true"
        />
        <Link to="/" className="relative">
          <Logo tone="light" />
        </Link>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            One platform, three tailored experiences.
          </h2>
          <p className="mt-3 max-w-md text-ink-300">
            Run your entire event operation — from platform oversight to team
            workflows to attendee tickets — in a single place.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-ink-200">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">
          © {new Date().getFullYear()} EventFlow
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
