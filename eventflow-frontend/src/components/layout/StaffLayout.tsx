import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Users, ScanLine, BellRing, LogOut, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/staff', label: 'Overview', icon: CalendarDays, end: true },
  { to: '/staff/registrations', label: 'Registrations', icon: Users },
  { to: '/staff/check-in', label: 'Check-in', icon: ScanLine },
  { to: '/staff/notifications', label: 'Notifications', icon: BellRing },
];

export function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/staff" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded bg-ink-900 text-sm font-bold text-white">E</span>
            <span className="text-sm font-semibold text-ink-900">EventFlow · Operations</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to} to={to} end={end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 rounded px-3 py-1.5 text-sm',
                  isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-100',
                )}
                children={<><Icon className="h-4 w-4" /> {label}</>}
              />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="hidden items-center gap-2 rounded p-1 text-sm md:flex">
              <Avatar name={user?.name} size={28} />
              <span className="font-medium text-ink-800">{user?.name}</span>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
