import {
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  Link,
} from 'react-router-dom';
import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  Menu,
  X,
  LogOut,
  Ticket as TicketIcon,
  ChevronDown,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

export interface NavGroup {
  label: string;
  items: {
    to: string;
    label: string;
    icon: ReactNode;
    badge?: string;
    end?: boolean;
  }[];
}

interface Props {
  brand: string;
  brandLabel: string;
  groups: NavGroup[];
  accent?: 'brand' | 'sky' | 'orange' | 'violet';
}

const accentMap = {
  brand: 'from-brand-500 to-sky-500',
  sky: 'from-sky-500 to-blue-600',
  orange: 'from-orange-500 to-rose-500',
  violet: 'from-violet-500 to-fuchsia-500',
};

const roleLabelMap: Record<string, string> = {
  owner: 'Platform Owner',
  admin: 'Organization Admin',
  staff: 'Staff',
  user: 'User',
};

export function DashboardLayout({
  brand,
  brandLabel,
  groups,
  accent = 'brand',
}: Props) {
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const {
    user,
    displayName,
    signOut,
    role,
  } = useAuth();

  const nav = useNavigate();
  const loc = useLocation();

  /*
   * IMPORTANT:
   * Hover dropdown is enabled ONLY for Organization Admin.
   * Owner Console keeps its existing click behaviour.
   */
  const isOrganizationConsole =
    brandLabel.toLowerCase() ===
    'organization admin';

  const pageTitle = (() => {
    const flat = groups.flatMap(
      (group) => group.items,
    );

    const active =
      flat.find(
        (item) => item.to === loc.pathname,
      ) ||
      flat.find(
        (item) =>
          loc.pathname.startsWith(item.to) &&
          item.to !== '/',
      );

    return active?.label || brandLabel;
  })();

  const roleLabel =
    roleLabelMap[role || 'user'] || 'User';

  const avatarLetter =
    displayName?.slice(0, 1)?.toUpperCase() ||
    'U';

  return (
    <div className="min-h-screen bg-ink-50">
      {/* =====================================================
          Sidebar Overlay - Mobile
      ===================================================== */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-ink-950/60 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* =====================================================
          Sidebar
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-ink-950 text-ink-100 transition-transform lg:translate-x-0 ${open
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Brand */}

        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accentMap[accent]}`}
            >
              <TicketIcon className="h-4 w-4 text-white" />
            </div>

            <div className="leading-tight">
              <p className="font-display text-sm font-bold text-white">
                {brand}
              </p>

              <p className="text-[10px] uppercase tracking-widest text-ink-400">
                {brandLabel}
              </p>
            </div>
          </Link>

          <button
            className="rounded-lg p-1 text-ink-400 hover:bg-white/5 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}

        <nav className="flex-1 space-y-6 overflow-y-auto p-4 scroll-thin">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-ink-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <span className="text-ink-400 group-hover:text-white">
                      {item.icon}
                    </span>

                    <span className="flex-1">
                      {item.label}
                    </span>

                    {item.badge && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accentMap[accent]} text-sm font-bold text-white`}
            >
              {avatarLetter}
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>

              <p className="truncate text-xs text-ink-400">
                {roleLabel}
              </p>
            </div>

            <button
              onClick={async () => {
                await signOut();
                nav('/');
              }}
              className="rounded-lg p-2 text-ink-400 hover:bg-white/10"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================
          Main
      ===================================================== */}

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-72">
        {/* Header */}

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          {/* Mobile menu */}

          <button
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}

          <div>
            <p className="text-xs text-ink-500">
              {brandLabel}
            </p>

            <h1 className="font-display text-lg font-semibold leading-none text-ink-900">
              {pageTitle}
            </h1>
          </div>

          {/* Header actions */}

          <div className="ml-auto flex items-center gap-2">
            {/* =================================================
                User menu
            ================================================= */}

            <div
              className="relative"
              onMouseEnter={
                isOrganizationConsole
                  ? () => setUserMenu(true)
                  : undefined
              }
              onMouseLeave={
                isOrganizationConsole
                  ? () => setUserMenu(false)
                  : undefined
              }
            >
              <button
                onClick={() => {
                  if (!isOrganizationConsole) {
                    setUserMenu(
                      (value) => !value,
                    );
                  }
                }}
                className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${accentMap[accent]} text-xs font-bold text-white`}
                >
                  {avatarLetter}
                </div>

                <span className="hidden max-w-32 truncate text-sm font-medium text-ink-800 sm:inline">
                  {displayName}
                </span>

                <ChevronDown className="h-4 w-4 text-ink-500" />
              </button>

              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 6,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: 6,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                    className="absolute right-0 top-full z-50 pt-2"
                  >
                    <div className="w-52 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-xl">
                      {/* Profile */}

                      <Link
                        to="/profile"
                        className="block px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                        onClick={() =>
                          setUserMenu(false)
                        }
                      >
                        Profile
                      </Link>

                      {/* Sign out */}

                      <button
                        onClick={async () => {
                          await signOut();
                          setUserMenu(false);
                          nav('/');
                        }}
                        className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page */}

        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}