import {
  DashboardLayout,
  type NavGroup,
} from './DashboardLayout';

import {
  LayoutGrid,
  CalendarDays,
  Users,
  Ticket,
  BarChart3,
  Building2,
  Bell,
  Settings,
  ClipboardList,
  Timer,
} from 'lucide-react';

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        end: true,
        label: 'Overview',
        icon: (
          <LayoutGrid className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/analytics',
        label: 'Analytics',
        icon: (
          <BarChart3 className="h-4 w-4" />
        ),
      },
    ],
  },

  {
    label: 'Events',
    items: [
      {
        to: '/dashboard/events',
        label: 'All Events',
        icon: (
          <CalendarDays className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/registrations',
        label: 'Registrations',
        icon: (
          <ClipboardList className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/attendees',
        label: 'Attendees',
        icon: (
          <Users className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/waitlist',
        label: 'Waitlist',
        icon: (
          <Timer className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/tickets',
        label: 'Tickets & Check-in',
        icon: (
          <Ticket className="h-4 w-4" />
        ),
      },
    ],
  },

  {
    label: 'Organization',
    items: [
      {
        to: '/dashboard/organization',
        label: 'Organization',
        icon: (
          <Building2 className="h-4 w-4" />
        ),
      },
    ],
  },

  {
    label: 'Account',
    items: [
      {
        to: '/dashboard/notifications',
        label: 'Notifications',
        icon: (
          <Bell className="h-4 w-4" />
        ),
      },
      {
        to: '/dashboard/settings',
        label: 'Settings',
        icon: (
          <Settings className="h-4 w-4" />
        ),
      },
    ],
  },
];

export function OwnerLayout() {
  return (
    <DashboardLayout
      brand="EventFlow"
      brandLabel="Owner console"
      groups={groups}
      accent="brand"
    />
  );
}