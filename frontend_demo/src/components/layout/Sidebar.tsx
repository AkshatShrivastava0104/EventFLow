import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Building2, Ticket, CheckSquare, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Organizations', to: '/organizations', icon: Building2 },
  { label: 'Events', to: '/events', icon: Calendar },
  { label: 'My Registrations', to: '/registrations', icon: CheckSquare },
  { label: 'My Tickets', to: '/tickets', icon: Ticket },
  { label: 'Notifications', to: '/notifications', icon: Bell, showBadge: true },
];

export function Sidebar() {
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list(1, 1),
    refetchInterval: 30000,
  });

  // Calculate unread count globally. Wait, notifications API returns paginated.
  // We can just rely on the Topbar for unread count, or pass it down via context.
  // For simplicity, we can fetch page 1 limit 10 and see if any are unread, 
  // or we can rely on a specific unread count endpoint if backend had one.
  // The backend notifications model has 'status' (unread/read).
  // Let's assume the Topbar handles the unread badge and skip it in the Sidebar for now,
  // or just show a generic dot if any unread exists in the first page.
  const hasUnread = notificationsData?.notifications.some((n) => n.status === 'unread');

  return (
    <aside className="w-64 flex flex-col bg-canvas border-r border-hairline min-h-screen sticky top-0 h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">EventFlow</h1>
      </div>
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors',
                isActive
                  ? 'bg-elevated text-ink shadow-whisper border border-hairline'
                  : 'text-body hover:text-ink hover:bg-hairline-soft border border-transparent'
              )
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && hasUnread && (
              <span className="w-2 h-2 rounded-full bg-link"></span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-hairline">
        <p className="text-[12px] text-mute font-mono uppercase tracking-wider">v0.1.0</p>
      </div>
    </aside>
  );
}
