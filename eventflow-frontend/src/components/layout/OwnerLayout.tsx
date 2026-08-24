import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CalendarDays, Users, Ticket,
  ScanLine, BellRing, Settings, X,
} from 'lucide-react';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopbar } from './OwnerTopbar';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/organizations', label: 'Organizations', icon: Building2 },
  { to: '/owner/events', label: 'Events', icon: CalendarDays },
  { to: '/owner/registrations', label: 'Registrations', icon: Users },
  { to: '/owner/tickets', label: 'Tickets', icon: Ticket },
  { to: '/owner/check-in', label: 'Check-in', icon: ScanLine },
  { to: '/owner/notifications', label: 'Notifications', icon: BellRing },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
];

export function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink-50">
      <OwnerSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-ink-950 p-3 text-ink-200">
            <div className="mb-2 flex items-center justify-between">
              <Link to="/owner/dashboard" className="flex items-center gap-2 text-white">
                <span className="grid h-7 w-7 place-items-center rounded bg-white font-bold text-ink-950">E</span>
                <span className="text-sm font-semibold">EventFlow</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="rounded p-1 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded px-3 py-2 text-sm',
                    isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5',
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <OwnerTopbar onMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
