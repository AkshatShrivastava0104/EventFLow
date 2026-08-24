import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';
import { OwnerLayout } from '@/components/layout/OwnerLayout';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { AppShell } from '@/components/layout/AppShell';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { OwnerDashboardPage } from '@/pages/owner/OwnerDashboardPage';
import { OrganizationsPage } from '@/pages/owner/OrganizationsPage';
import { OrganizationCreatePage } from '@/pages/owner/OrganizationCreatePage';
import { OrganizationDetailPage } from '@/pages/owner/OrganizationDetailPage';
import { EventsPage } from '@/pages/owner/EventsPage';
import { EventCreatePage } from '@/pages/owner/EventCreatePage';
import { EventEditPage } from '@/pages/owner/EventEditPage';
import { EventDetailPage } from '@/pages/owner/EventDetailPage';
import { RegistrationsPage } from '@/pages/owner/RegistrationsPage';
import { TicketsPage } from '@/pages/owner/TicketsPage';
import { CheckInPage } from '@/pages/owner/CheckInPage';
import { NotificationsCenterPage } from '@/pages/notifications/NotificationsCenterPage';
import { SettingsPage } from '@/pages/owner/SettingsPage';
import { BrowseEventsPage } from '@/pages/attendee/BrowseEventsPage';
import { AttendeeEventDetailPage } from '@/pages/attendee/AttendeeEventDetailPage';
import { MyRegistrationsPage } from '@/pages/attendee/MyRegistrationsPage';
import { MyTicketsPage } from '@/pages/attendee/MyTicketsPage';
import { StaffDashboardPage } from '@/pages/staff/StaffDashboardPage';
import { StaffEventDetailPage } from '@/pages/staff/StaffEventDetailPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage';

function RoleHome() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    switch (user.role) {
        case 'owner':
        case 'admin':
            return <Navigate to="/owner/dashboard" replace />;
        case 'staff':
            return <Navigate to="/staff" replace />;
        case 'attendee':
        default:
            return <Navigate to="/app/events" replace />;
    }
}

export function AppRoutes() {
    const location = useLocation();
    return (
        <AppShell>
            <Routes location={location}>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                {/* Owner / Admin */}
                <Route element={<ProtectedRoute roles={['owner', 'admin']} />}>
                    <Route path="/owner" element={<OwnerLayout />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<OwnerDashboardPage />} />
                        <Route path="organizations" element={<OrganizationsPage />} />
                        <Route path="organizations/new" element={<OrganizationCreatePage />} />
                        <Route path="organizations/:orgId" element={<OrganizationDetailPage />} />
                        <Route path="events" element={<EventsPage />} />
                        <Route path="events/new" element={<EventCreatePage />} />
                        <Route path="events/:eventId" element={<EventDetailPage />} />
                        <Route path="events/:eventId/edit" element={<EventEditPage />} />
                        <Route path="registrations" element={<RegistrationsPage />} />
                        <Route path="tickets" element={<TicketsPage />} />
                        <Route path="check-in" element={<CheckInPage />} />
                        <Route path="notifications" element={<NotificationsCenterPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Route>

                {/* Staff */}
                <Route element={<ProtectedRoute roles={['owner', 'admin', 'staff']} />}>
                    <Route path="/staff" element={<StaffLayout />}>
                        <Route index element={<StaffDashboardPage />} />
                        <Route path="registrations" element={<RegistrationsPage />} />
                        <Route path="events/:eventId" element={<StaffEventDetailPage />} />
                        <Route path="check-in" element={<CheckInPage />} />
                        <Route path="notifications" element={<NotificationsCenterPage />} />
                    </Route>
                </Route>

                {/* Attendee / Any user */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/app" element={<AttendeeLayout />}>
                        <Route index element={<Navigate to="events" replace />} />
                        <Route path="events" element={<BrowseEventsPage />} />
                        <Route path="events/:eventId" element={<AttendeeEventDetailPage />} />
                        <Route path="registrations" element={<MyRegistrationsPage />} />
                        <Route path="tickets" element={<MyTicketsPage />} />
                        <Route path="notifications" element={<NotificationsCenterPage />} />
                    </Route>
                </Route>

                {/* Default */}
                <Route path="/" element={<RoleHome />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AppShell>
    );
}
