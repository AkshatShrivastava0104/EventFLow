import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CalendarDays, Users, Ticket,
  ScanLine, BellRing, Settings, ChevronLeft,
} from 'lucide-react';
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

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function OwnerSidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn(
        'sticky top-0 z-40 hidden h-screen shrink-0 border-r border-ink-800 bg-ink-950 text-ink-300 lg:flex lg:flex-col',
        collapsed ? 'w-[68px]' : 'w-64',
        'transition-[width] duration-200',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-ink-800 px-4">
        <div className="grid h-7 w-7 place-items-center rounded bg-white text-ink-950 font-bold">E</div>
        {!collapsed && <span className="text-sm font-semibold text-white">EventFlow</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => cn(
                  'group flex items-center gap-3 rounded px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        onClick={onToggle}
        className="m-3 flex items-center justify-center gap-2 rounded p-2 text-ink-400 hover:bg-white/5 hover:text-white"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </aside>
  );
}
