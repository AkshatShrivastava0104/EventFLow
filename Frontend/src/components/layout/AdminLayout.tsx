import {
    DashboardLayout,
    type NavGroup,
} from './DashboardLayout';

import {
    LayoutGrid,
    CalendarDays,
    BarChart3,
    Users,
    ClipboardList,
    Ticket,
    Building2,
    Bell,
    Settings,
    ShieldCheck,
} from 'lucide-react';

export function AdminLayout() {
    const groups: NavGroup[] = [
        {
            label: 'Organization',
            items: [
                {
                    to: '/admin',
                    end: true,
                    label: 'Overview',
                    icon: (
                        <LayoutGrid className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/organization',
                    label: 'Organization',
                    icon: (
                        <Building2 className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/members',
                    label: 'Members & Roles',
                    icon: (
                        <ShieldCheck className="h-4 w-4" />
                    ),
                },
            ],
        },

        {
            label: 'Events',
            items: [
                {
                    to: '/admin/events',
                    label: 'Events',
                    icon: (
                        <CalendarDays className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/analytics',
                    label: 'Analytics',
                    icon: (
                        <BarChart3 className="h-4 w-4" />
                    ),
                },
            ],
        },

        {
            label: 'Attendees',
            items: [
                {
                    to: '/admin/registrations',
                    label: 'Registrations',
                    icon: (
                        <ClipboardList className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/attendees',
                    label: 'Attendees',
                    icon: (
                        <Users className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/tickets',
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
                    to: '/admin/notifications',
                    label: 'Notifications',
                    icon: (
                        <Bell className="h-4 w-4" />
                    ),
                },
                {
                    to: '/admin/settings',
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
            brandLabel="Organization admin"
            groups={groups}
            accent="sky"
        />
    );
}