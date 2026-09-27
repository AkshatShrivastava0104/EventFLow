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
import { Registrations } from './pages/owner/Registrations';
import { Attendees } from './pages/owner/Attendees';
import { WaitlistPage } from './pages/owner/Waitlist';
import { TicketsAdmin } from './pages/owner/TicketsAdmin';
import { OrganizationPage } from './pages/owner/Organization';
import { StaffPage } from './pages/owner/Staff';
import { OwnerSettings } from './pages/owner/Settings';

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

        <Route
          path="tickets"
          element={<TicketsAdmin />}
        />

        <Route
          path="organization"
          element={<OrganizationPage />}
        />

        <Route
          path="staff"
          element={<StaffPage />}
        />

        <Route
          path="notifications"
          element={<Notifications />}
        />

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
        {/* /admin */}
        <Route
          index
          element={<AdminOverview />}
        />

        {/* /admin/events */}
        <Route
          path="events"
          element={<EventsTable />}
        />

        {/* /admin/events/new */}
        <Route
          path="events/new"
          element={<EventEditor />}
        />

        {/* /admin/events/:id/edit */}
        <Route
          path="events/:id/edit"
          element={<EventEditor />}
        />

        {/* /admin/analytics */}
        <Route
          path="analytics"
          element={<AdminAnalytics />}
        />

        {/* /admin/registrations */}
        <Route
          path="registrations"
          element={<Registrations />}
        />

        {/* /admin/attendees */}
        <Route
          path="attendees"
          element={<Attendees />}
        />

        {/* /admin/tickets */}
        <Route
          path="tickets"
          element={<TicketsAdmin />}
        />

        {/* /admin/organization */}
        <Route
          path="organization"
          element={<OrganizationPage />}
        />

        {/* /admin/members */}
        <Route
          path="members"
          element={<StaffPage />}
        />

        {/* /admin/notifications */}
        <Route
          path="notifications"
          element={<Notifications />}
        />

        {/* /admin/settings */}
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
        {/* /staff */}
        <Route
          index
          element={<StaffOverview />}
        />

        {/* /staff/events */}
        <Route
          path="events"
          element={<StaffEvents />}
        />

        {/* /staff/scanner */}
        <Route
          path="scanner"
          element={<ScannerPage />}
        />

        {/* /staff/tickets */}
        <Route
          path="tickets"
          element={<StaffTickets />}
        />

        {/* /staff/attendees */}
        <Route
          path="attendees"
          element={<StaffAttendees />}
        />

        {/* /staff/notifications */}
        <Route
          path="notifications"
          element={<Notifications />}
        />

        {/* /staff/settings */}
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