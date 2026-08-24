import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarSearch, Menu, Ticket, ClipboardList, X, LucideIcon } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Browse', icon: CalendarSearch, end: true },
  { to: '/app/registrations', label: 'My registrations', icon: ClipboardList },
  { to: '/app/tickets', label: 'My tickets', icon: Ticket },
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-ink-900 text-white'
      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  );
}

export function AttendeeLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/app" className="shrink-0">
            <Logo />
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <RoleSwitcher />
            </div>
            <NotificationBell />
            <UserMenu />
            <button
              className="grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-ink-100 bg-white px-4 pb-3 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={navClass}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
              <div className="pt-2 sm:hidden">
                <RoleSwitcher />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
