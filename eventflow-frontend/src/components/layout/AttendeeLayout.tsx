import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Ticket as TicketIcon, Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/app/events', label: 'Discover', icon: Calendar },
  { to: '/app/registrations', label: 'My events', icon: TicketIcon },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
];

export function AttendeeLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/app/events" className="flex items-center gap-2 text-ink-900">
            <span className="grid h-7 w-7 place-items-center rounded bg-ink-900 text-sm font-bold text-white">E</span>
            <span className="text-sm font-semibold">EventFlow</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 rounded px-3 py-1.5 text-sm',
                  isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
                children={(
                  <>
                    <Icon className="h-4 w-4" /> {label}
                  </>
                )}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <div className="hidden items-center gap-2 rounded p-1 text-sm md:flex">
              <Avatar name={user?.name} size={28} />
              <span className="font-medium text-ink-800">{user?.name}</span>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="hidden items-center gap-1 rounded px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-100 md:flex"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(o => !o)}
              className="ml-1 grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100 md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-ink-200 bg-white px-4 py-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to} to={to} onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm text-ink-700 hover:bg-ink-100"
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
              <button
                onClick={async () => { await logout(); navigate('/login'); }}
                className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-100"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
