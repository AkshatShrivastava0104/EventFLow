import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  Menu,
  X,
  Search,
  Bell,
  Ticket,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Shield,
  Settings,
} from 'lucide-react';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { NotificationsAPI } from '../../lib/queries';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const {
    user,
    displayName,
    signOut,
    role,
  } = useAuth();

  const nav = useNavigate();
  const location = useLocation();

  /*
   * ------------------------------------------------------------
   * Role configuration
   * ------------------------------------------------------------
   */

  const normalizedRole = role?.toLowerCase();

  const isOwner =
    normalizedRole === 'owner' ||
    normalizedRole === 'platform_owner';

  const isAdmin = normalizedRole === 'admin';

  const isStaff = normalizedRole === 'staff';

  const isRestrictedRole =
    isOwner || isAdmin || isStaff;

  /*
   * ------------------------------------------------------------
   * Dashboard destination
   * ------------------------------------------------------------
   */

  const dashboardPath = isOwner
    ? '/dashboard'
    : isAdmin
      ? '/admin'
      : isStaff
        ? '/staff'
        : null;

  const dashboardLabel = isOwner
    ? 'Owner Dashboard'
    : isAdmin
      ? 'Admin Dashboard'
      : isStaff
        ? 'Staff Console'
        : null;

  /*
   * ------------------------------------------------------------
   * Prevent restricted users from accessing public pages
   *
   * Owner/Admin/Staff should never remain on:
   * /
   * /events
   * /organizers
   * /login
   * /register
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!user || !isRestrictedRole || !dashboardPath) {
      return;
    }

    const publicPaths = [
      '/',
      '/events',
      '/organizers',
      '/login',
      '/register',
    ];

    const isPublicPath =
      publicPaths.includes(location.pathname);

    if (isPublicPath && location.pathname !== dashboardPath) {
      nav(dashboardPath, {
        replace: true,
      });
    }
  }, [
    user,
    isRestrictedRole,
    dashboardPath,
    location.pathname,
    nav,
  ]);

  /*
   * ------------------------------------------------------------
   * Navigation
   *
   * Restricted users should not see public navigation.
   * ------------------------------------------------------------
   */

  const navItems = isRestrictedRole
    ? []
    : [
      {
        to: '/',
        label: 'Home',
        end: true,
      },
      {
        to: '/events',
        label: 'Browse Events',
      },
      {
        to: '/organizers',
        label: 'For Organizers',
      },
    ];

  /*
   * ------------------------------------------------------------
   * Account label
   * ------------------------------------------------------------
   */

  const accountLabel = isOwner
    ? 'PLATFORM OWNER'
    : isAdmin
      ? 'ADMIN ACCOUNT'
      : isStaff
        ? 'STAFF ACCOUNT'
        : 'USER ACCOUNT';

  /*
   * ------------------------------------------------------------
   * Notifications
   * ------------------------------------------------------------
   */

  const { data: notifs } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () =>
      NotificationsAPI.list({
        user_id: user!.id,
      }),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const unread = (notifs ?? []).filter(
    (notification) =>
      !notification.read
  ).length;

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">

          {/* Logo */}

          <Link
            to={isRestrictedRole && dashboardPath ? dashboardPath : '/'}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-sm">
              <Ticket className="h-4 w-4" />
            </div>

            <span className="font-display text-lg font-bold text-ink-900">
              EventFlow
            </span>
          </Link>

          {/* Desktop Navigation */}

          {!isRestrictedRole && (
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive
                      ? 'bg-ink-100 text-ink-900'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">

            {/* Search */}

            {!isRestrictedRole && (
              <button
                onClick={() => nav('/events')}
                className="hidden h-9 items-center gap-2 rounded-full border border-ink-200 px-3 text-xs text-ink-500 hover:border-ink-400 sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                Search events...
              </button>
            )}

            {user ? (
              <>
                {/* Notifications */}

                <Link
                  to="/notifications"
                  className="relative rounded-lg p-2 text-ink-600 hover:bg-ink-100"
                >
                  <Bell className="h-5 w-5" />

                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>

                {/* Profile */}

                <div className="relative">
                  <button
                    onClick={() =>
                      setProfileOpen(
                        (value) => !value
                      )
                    }
                    className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 hover:border-ink-400"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold uppercase text-white">
                      {displayName.slice(0, 1)}
                    </div>

                    <span className="hidden text-sm font-medium text-ink-800 sm:inline">
                      {displayName}
                    </span>
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
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
                        className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-xl"
                        onMouseLeave={() =>
                          setProfileOpen(false)
                        }
                      >
                        {/* Account information */}

                        <div className="border-b border-ink-100 p-3">
                          <p className="text-sm font-semibold text-ink-900">
                            {displayName}
                          </p>

                          <p className="truncate text-xs text-ink-500">
                            {user.email}
                          </p>

                          <span className="mt-2 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                            {accountLabel}
                          </span>
                        </div>

                        <div className="py-1 text-sm">

                          {/* Everyone */}

                          <MenuLink
                            to="/profile"
                            icon={
                              <UserIcon className="h-4 w-4" />
                            }
                          >
                            Profile & Settings
                          </MenuLink>

                          {/* Normal users only */}

                          {!isRestrictedRole && (
                            <MenuLink
                              to="/my-registrations"
                              icon={
                                <Ticket className="h-4 w-4" />
                              }
                            >
                              My Registrations
                            </MenuLink>
                          )}

                          {/* Role-specific dashboard */}

                          {dashboardPath &&
                            dashboardLabel && (
                              <MenuLink
                                to={dashboardPath}
                                icon={
                                  isOwner ? (
                                    <LayoutDashboard className="h-4 w-4" />
                                  ) : isAdmin ? (
                                    <Settings className="h-4 w-4" />
                                  ) : (
                                    <Shield className="h-4 w-4" />
                                  )
                                }
                              >
                                {dashboardLabel}
                              </MenuLink>
                            )}
                        </div>

                        {/* Logout */}

                        <button
                          onClick={async () => {
                            await signOut();

                            setProfileOpen(false);

                            nav('/login', {
                              replace: true,
                            });
                          }}
                          className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                {/* Logged out */}

                <Link
                  to="/login"
                  className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 sm:inline"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                  Get started
                </Link>
              </>
            )}

            {/* Mobile menu */}

            {!isRestrictedRole && (
              <button
                className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 md:hidden"
                onClick={() =>
                  setOpen((value) => !value)
                }
              >
                {open ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}

        <AnimatePresence>
          {open && !isRestrictedRole && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-ink-100 bg-white md:hidden"
            >
              <div className="space-y-1 p-3">
                {navItems.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    onClick={() =>
                      setOpen(false)
                    }
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
                  >
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}

/* ============================================================
   Menu Link
   ============================================================ */

function MenuLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-4 py-2 text-ink-700 hover:bg-ink-50"
    >
      <span className="text-ink-500">
        {icon}
      </span>

      {children}
    </Link>
  );
}

/* ============================================================
   Footer
   ============================================================ */

function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white">
              <Ticket className="h-4 w-4" />
            </div>

            <span className="font-display text-lg font-bold">
              EventFlow
            </span>
          </div>

          <p className="mt-3 max-w-xs text-sm text-ink-500">
            The modern event platform. From
            first ticket to final check-in.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            ['Browse events', '/events'],
            ['For organizers', '/organizers'],
            ['Pricing', '/organizers'],
            ['Changelog', '/organizers'],
          ]}
        />

        <FooterCol
          title="Company"
          links={[
            ['About', '/'],
            ['Careers', '/'],
            ['Contact', '/'],
            ['Press kit', '/'],
          ]}
        />

        <FooterCol
          title="Resources"
          links={[
            ['Docs', '/organizers'],
            ['Support', '/'],
            ['Status', '/'],
            ['Privacy', '/'],
          ]}
        />
      </div>

      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-ink-500 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} EventFlow, Inc.
          </p>

          <p>
            Built for organizers who take events seriously.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Footer Column
   ============================================================ */

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="font-display text-sm font-semibold text-ink-900">
        {title}
      </p>

      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              to={href}
              className="text-ink-500 hover:text-ink-900"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}