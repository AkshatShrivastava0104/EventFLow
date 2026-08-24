import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RequireAuth, RequireAdmin, RequireOrg, PublicOnly } from './ProtectedRoute';

// Layouts and guards stay eager — they're small and needed on every navigation.
import { OwnerLayout } from '@/components/layout/OwnerLayout';
import { OrgLayout } from '@/components/layout/OrgLayout';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';

// Pages are code-split per route so each role only downloads what it uses
// (e.g. the recharts-heavy dashboards never load for a plain attendee).

// Public
const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })));
const Login = lazy(() => import('@/pages/auth/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/auth/Register').then((m) => ({ default: m.Register })));
const Forbidden = lazy(() => import('@/pages/misc/Forbidden').then((m) => ({ default: m.Forbidden })));
const NotFound = lazy(() => import('@/pages/misc/NotFound').then((m) => ({ default: m.NotFound })));

// Owner console
const PlatformDashboard = lazy(() =>
  import('@/pages/owner/PlatformDashboard').then((m) => ({ default: m.PlatformDashboard })),
);
const OwnerOrganizations = lazy(() =>
  import('@/pages/owner/Organizations').then((m) => ({ default: m.OwnerOrganizations })),
);
const OwnerUsers = lazy(() => import('@/pages/owner/Users').then((m) => ({ default: m.OwnerUsers })));
const SystemHealth = lazy(() =>
  import('@/pages/owner/SystemHealth').then((m) => ({ default: m.SystemHealth })),
);

// Organization workspace
const OrgCreate = lazy(() => import('@/pages/org/OrgCreate').then((m) => ({ default: m.OrgCreate })));
const OrgDashboard = lazy(() =>
  import('@/pages/org/Dashboard').then((m) => ({ default: m.OrgDashboard })),
);
const OrgEvents = lazy(() => import('@/pages/org/Events').then((m) => ({ default: m.OrgEvents })));
const EventCreate = lazy(() =>
  import('@/pages/org/EventCreate').then((m) => ({ default: m.EventCreate })),
);
const OrgEventDetail = lazy(() =>
  import('@/pages/org/EventDetail').then((m) => ({ default: m.OrgEventDetail })),
);
const EventEdit = lazy(() => import('@/pages/org/EventEdit').then((m) => ({ default: m.EventEdit })));
const EventCheckIn = lazy(() =>
  import('@/pages/org/EventCheckIn').then((m) => ({ default: m.EventCheckIn })),
);
const Members = lazy(() => import('@/pages/org/Members').then((m) => ({ default: m.Members })));
const CheckInHub = lazy(() => import('@/pages/org/CheckIn').then((m) => ({ default: m.CheckInHub })));
const Analytics = lazy(() => import('@/pages/org/Analytics').then((m) => ({ default: m.Analytics })));
const OrgSettings = lazy(() => import('@/pages/org/Settings').then((m) => ({ default: m.OrgSettings })));

// Attendee app
const Browse = lazy(() => import('@/pages/app/Browse').then((m) => ({ default: m.Browse })));
const AppEventDetail = lazy(() =>
  import('@/pages/app/EventDetail').then((m) => ({ default: m.AppEventDetail })),
);
const MyRegistrations = lazy(() =>
  import('@/pages/app/MyRegistrations').then((m) => ({ default: m.MyRegistrations })),
);
const MyTickets = lazy(() => import('@/pages/app/MyTickets').then((m) => ({ default: m.MyTickets })));
const Notifications = lazy(() =>
  import('@/pages/app/Notifications').then((m) => ({ default: m.Notifications })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Organization creation only requires auth, not existing membership. */}
      <Route element={<RequireAuth />}>
        <Route path="/org/create" element={<OrgCreate />} />
      </Route>

      {/* Owner — platform super-admin console */}
      <Route element={<RequireAdmin />}>
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<PlatformDashboard />} />
          <Route path="organizations" element={<OwnerOrganizations />} />
          <Route path="users" element={<OwnerUsers />} />
          <Route path="system" element={<SystemHealth />} />
        </Route>
      </Route>

      {/* Organization — workspace */}
      <Route element={<RequireOrg />}>
        <Route path="/org" element={<OrgLayout />}>
          <Route index element={<OrgDashboard />} />
          <Route path="events" element={<OrgEvents />} />
          <Route path="events/new" element={<EventCreate />} />
          <Route path="events/:eventId" element={<OrgEventDetail />} />
          <Route path="events/:eventId/edit" element={<EventEdit />} />
          <Route path="events/:eventId/check-in" element={<EventCheckIn />} />
          <Route path="members" element={<Members />} />
          <Route path="check-in" element={<CheckInHub />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<OrgSettings />} />
        </Route>
      </Route>

      {/* Attendee — any authenticated user */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AttendeeLayout />}>
          <Route index element={<Browse />} />
          <Route path="events/:eventId" element={<AppEventDetail />} />
          <Route path="registrations" element={<MyRegistrations />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
