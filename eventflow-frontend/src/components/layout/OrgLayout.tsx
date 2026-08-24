import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  Menu,
  Plus,
  QrCode,
  Settings,
  Users,
  X,
  LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { useOrg } from '@/contexts/OrgContext';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/org', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/org/events', label: 'Events', icon: CalendarDays },
  { to: '/org/members', label: 'Members', icon: Users },
  { to: '/org/check-in', label: 'Check-in', icon: QrCode },
  { to: '/org/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/org/settings', label: 'Settings', icon: Settings },
];

function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrgId } = useOrg();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative px-3 pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg border border-ink-200 bg-white px-3 py-2 text-left hover:bg-ink-50"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-600 text-2xs font-semibold text-white">
          {initials(activeOrg?.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">
            {activeOrg?.name ?? 'Select organization'}
          </span>
          <span className="block text-xs text-ink-500">Workspace</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-ink-400" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-3 right-3 z-50 mt-1 rounded-lg border border-ink-200 bg-white p-1 shadow-pop">
            <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">
              Your organizations
            </p>
            <div className="max-h-64 overflow-y-auto">
              {organizations.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setActiveOrgId(o.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-ink-50',
                    o.id === activeOrg?.id && 'bg-accent-50',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-ink-900">
                    {o.name}
                  </span>
                  {o.id === activeOrg?.id && (
                    <Check className="h-4 w-4 text-accent-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="my-1 border-t border-ink-100" />
            <button
              onClick={() => {
                setOpen(false);
                navigate('/org/create');
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              <Plus className="h-4 w-4" /> Create organization
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-3">
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
                ? 'bg-accent-50 text-accent-700'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
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

export function OrgLayout() {
  const [drawer, setDrawer] = useState(false);
  const { activeOrg } = useOrg();

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-ink-100 px-5">
          <Logo />
        </div>
        <OrgSwitcher />
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
      </aside>

      {drawer && (
        <div className="lg:hidden">
          <button
            className="fixed inset-0 z-40 bg-ink-950/40"
            aria-hidden="true"
            onClick={() => setDrawer(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-ink-200 bg-white">
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
              <Logo />
              <button
                onClick={() => setDrawer(false)}
                className="grid h-8 w-8 place-items-center rounded text-ink-500 hover:bg-ink-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <OrgSwitcher />
            <NavItems onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">
              {activeOrg?.name ?? 'Workspace'}
            </p>
            <p className="text-2xs uppercase tracking-wide text-ink-400">
              Organization workspace
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
