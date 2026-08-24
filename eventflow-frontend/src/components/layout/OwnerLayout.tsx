import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  Building2,
  LayoutDashboard,
  Menu,
  Users,
  X,
  LucideIcon,
} from 'lucide-react';
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
  { to: '/owner', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/owner/organizations', label: 'Organizations', icon: Building2 },
  { to: '/owner/users', label: 'Users', icon: Users },
  { to: '/owner/system', label: 'System health', icon: Activity },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-ink-400 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarInner() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo tone="light" />
      </div>
      <div className="px-3 pb-2">
        <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-widest text-accent-400">
          Platform Console
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavItems />
      </div>
      <div className="border-t border-white/10 p-4">
        <p className="text-xs text-ink-500">Super-admin access</p>
      </div>
    </div>
  );
}

export function OwnerLayout() {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Fixed dark sidebar (lg+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden">
          <button
            className="fixed inset-0 z-40 bg-ink-950/50"
            aria-hidden="true"
            onClick={() => setDrawer(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-ink-950">
            <button
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded text-ink-400 hover:text-white"
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-16 items-center px-5">
              <Logo tone="light" />
            </div>
            <div className="px-3 pt-2">
              <NavItems onNavigate={() => setDrawer(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-ink-900 px-4 sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Logo tone="light" showText={false} size={28} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher tone="light" />
            <NotificationBell tone="light" />
            <UserMenu tone="light" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
