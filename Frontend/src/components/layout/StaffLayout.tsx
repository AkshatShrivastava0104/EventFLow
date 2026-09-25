import {
  DashboardLayout,
  type NavGroup,
} from './DashboardLayout';

import {
  LayoutGrid,
  CalendarDays,
  Users,
  ScanLine,
  Ticket,
  Bell,
  Settings,
} from 'lucide-react';

export function StaffLayout() {
  const groups: NavGroup[] = [
    {
      label: 'Console',
      items: [
        {
          to: '/staff',
          end: true,
          label: 'Overview',
          icon: (
            <LayoutGrid className="h-4 w-4" />
          ),
        },
        {
          to: '/staff/events',
          label: 'Events',
          icon: (
            <CalendarDays className="h-4 w-4" />
          ),
        },
      ],
    },

    {
      label: 'Attendees',
      items: [
        {
          to: '/staff/attendees',
          label: 'Attendees',
          icon: (
            <Users className="h-4 w-4" />
          ),
        },
        {
          to: '/staff/scanner',
          label: 'Check-in Scanner',
          icon: (
            <ScanLine className="h-4 w-4" />
          ),
        },
        {
          to: '/staff/tickets',
          label: 'Tickets',
          icon: (
            <Ticket className="h-4 w-4" />
          ),
        },
      ],
    },

    {
      label: 'Account',
      items: [
        {
          to: '/staff/notifications',
          label: 'Notifications',
          icon: (
            <Bell className="h-4 w-4" />
          ),
        },
        {
          to: '/staff/settings',
          label: 'Profile',
          icon: (
            <Settings className="h-4 w-4" />
          ),
        },
      ],
    },
  ];

  return (
    <DashboardLayout
      brand="EventFlow"
      brandLabel="Staff console"
      groups={groups}
      accent="sky"
    />
  );
}