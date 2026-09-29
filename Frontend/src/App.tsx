import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

import { PublicLayout } from './components/layout/PublicLayout';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { StaffLayout } from './components/layout/StaffLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { handleGoogleRedirect } from './lib/googleAuth';

// Public
import { Landing } from './pages/public/Landing';
import { BrowseEvents } from './pages/public/BrowseEvents';
import { EventDetails } from './pages/public/EventDetails';
import { OrganizersLanding } from './pages/public/OrganizersLanding';
import {
  Login,
  Register,
  ForgotPassword,
} from './pages/public/Login';

// User
import { RegisterEvent } from './pages/user/RegisterEvent';
import { CheckoutPage } from './pages/user/Checkout';
import { RegistrationSuccess } from './pages/user/RegistrationSuccess';
import { MyRegistrations } from './pages/user/MyRegistrations';
import { TicketPage } from './pages/user/TicketPage';
import { Notifications } from './pages/user/Notifications';
import { Profile } from './pages/user/Profile';

// Platform Owner
import { OwnerOverview } from './pages/owner/Overview';
import { Analytics as OwnerAnalytics } from './pages/owner/Analytics';
import { Analytics as AdminAnalytics } from './pages/admin/Analytics';
import { EventsTable } from './pages/owner/EventsTable';
import { EventEditor } from './pages/owner/EventEditor';
import { EventsAdmin } from './pages/admin/Events';
import { EventDetailsAdmin } from './pages/admin/EventDetails';
import { Registrations } from './pages/owner/Registrations';
import { Registrations as RegistrationsAdmin } from './pages/admin/Registrations';
import { Attendees } from './pages/owner/Attendees';
import AttendeesAdmin from './pages/admin/Attendees';
import { WaitlistPage } from './pages/owner/Waitlist';
import { TicketsOwner } from './pages/owner/TicketsAdmin';
import TicketsAdmin from './pages/admin/Tickets';
import { PlatformTickets } from './pages/owner/PlatformTickets';
import { Organizations } from './pages/owner/Organization';
import { Organization as OrganizationAdmin } from './pages/admin/Organization';
import { Users } from './pages/owner/Users';
import { StaffPage } from './pages/owner/Staff';
import { OwnerSettings } from './pages/owner/Settings';
import ActivityLogs from './pages/owner/ActivityLogs';
import SystemHealth from './pages/owner/SystemHealth';
import { Notifications as OwnerNotifications } from './pages/owner/Notification';
import { Notifications as NotificationsAdmin } from './pages/admin/Notifications';

// Organization Admin
import { AdminOverview } from './pages/admin/Overview';

// Organization Staff
import { StaffOverview } from './pages/staff/StaffOverview';
import { StaffEvents } from './pages/staff/StaffEvents';
import { ScannerPage } from './pages/staff/Scanner';
import { StaffTickets } from './pages/staff/StaffTickets';
import { StaffAttendees } from './pages/staff/StaffAttendees';

export default function App() {
  useEffect(() => {
    handleGoogleRedirect();
  }, []);

  return (
    <Routes>
      {/* =========================================================
          PUBLIC SITE
      ========================================================= */}

      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/events"
          element={<BrowseEvents />}
        />

        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        <Route
          path="/organizers"
          element={<OrganizersLanding />}
        />

        {/* Authentication */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* =====================================================
            AUTHENTICATED USERS
        ===================================================== */}

        <Route
          path="/events/:id/register"
          element={
            <ProtectedRoute
              roles={[
                'user',
                'admin',
                'staff',
              ]}
            >
              <RegisterEvent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:id/checkout"
          element={
            <ProtectedRoute
              roles={[
                'user',
                'admin',
                'staff',
              ]}
            >
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/registrations/:id/success"
          element={
            <ProtectedRoute
              roles={[
                'user',
                'admin',
                'staff',
              ]}
            >
              <RegistrationSuccess />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-registrations"
          element={
            <ProtectedRoute
              roles={[
                'user',
                'admin',
                'staff',
              ]}
            >
              <MyRegistrations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute
              roles={[
                'user',
                'admin',
                'staff',
              ]}
            >
              <TicketPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              roles={[
                'owner',
                'admin',
                'staff',
                'user',
              ]}
            >
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute
              roles={[
                'owner',
                'admin',
                'staff',
                'user',
              ]}
            >
              <Profile />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* =========================================================
          PLATFORM OWNER
          /dashboard
      ========================================================= */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<OwnerOverview />}
        />

        <Route
          path="analytics"
          element={<OwnerAnalytics />}
        />

        <Route
          path="events"
          element={<EventsTable />}
        />

        <Route
          path="events/new"
          element={<EventEditor />}
        />

        <Route
          path="events/:id/edit"
          element={<EventEditor />}
        />

        <Route
          path="registrations"
          element={<Registrations />}
        />

        <Route
          path="attendees"
          element={<Attendees />}
        />

        <Route
          path="waitlist"
          element={<WaitlistPage />}
        />

        {/* Platform-wide ticket monitoring only.
            Owner does not have check-in functionality. */}
        <Route
          path="platform-tickets"
          element={<PlatformTickets />}
        />

        {/* Platform Organizations */}
        <Route
          path="organizations"
          element={<Organizations />}
        />

        {/* Platform Users */}
        <Route
          path="users"
          element={<Users />}
        />

        {/* Platform Activity Logs */}
        <Route
          path="activity-logs"
          element={<ActivityLogs />}
        />

        {/* System Health */}
        <Route
          path="system-health"
          element={<SystemHealth />}
        />

        {/* Owner Staff Management */}
        <Route
          path="staff"
          element={<StaffPage />}
        />

        {/* Owner Platform Notifications */}
        <Route
          path="notifications"
          element={<OwnerNotifications />}
        />

        {/* Owner Settings */}
        <Route
          path="settings"
          element={<OwnerSettings />}
        />
      </Route>

      {/* =========================================================
          ORGANIZATION ADMIN
          /admin
      ========================================================= */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<AdminOverview />}
        />

        <Route
          path="events"
          element={<EventsAdmin />}
        />

        <Route
          path="events/new"
          element={<EventEditor />}
        />

        <Route
          path="events/:id/edit"
          element={<EventEditor />}
        />

        <Route
          path="events/:id/view"
          element={<EventDetailsAdmin />}
        />

        <Route
          path="analytics"
          element={<AdminAnalytics />}
        />

        <Route
          path="registrations"
          element={<RegistrationsAdmin />}
        />

        <Route
          path="attendees"
          element={<AttendeesAdmin />}
        />

        <Route
          path="tickets"
          element={<TicketsAdmin />}
        />

        <Route
          path="organization"
          element={<OrganizationAdmin />}
        />

        <Route
          path="members"
          element={<StaffPage />}
        />

        <Route
          path="notifications"
          element={<NotificationsAdmin />}
        />

        <Route
          path="settings"
          element={<Profile />}
        />
      </Route>

      {/* =========================================================
          ORGANIZATION STAFF
          /staff
      ========================================================= */}

      <Route
        path="/staff"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<StaffOverview />}
        />

        <Route
          path="events"
          element={<StaffEvents />}
        />

        <Route
          path="scanner"
          element={<ScannerPage />}
        />

        <Route
          path="tickets"
          element={<StaffTickets />}
        />

        <Route
          path="attendees"
          element={<StaffAttendees />}
        />

        <Route
          path="notifications"
          element={<Notifications />}
        />

        <Route
          path="settings"
          element={<Profile />}
        />
      </Route>

      {/* =========================================================
          FALLBACK
      ========================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}