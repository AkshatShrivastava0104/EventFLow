import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/guards/RouteGuards';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OrganizationsListPage } from './pages/organizations/OrganizationsListPage';
import { OrganizationFormPage } from './pages/organizations/OrganizationFormPage';
import { OrganizationDetailPage } from './pages/organizations/OrganizationDetailPage';
import { EventsPage } from './pages/events/EventsPage';
import { EventDetailPage } from './pages/events/EventDetailPage';
import { EventFormPage } from './pages/events/EventFormPage';
import { MyRegistrationsPage } from './pages/registrations/MyRegistrationsPage';
import { MyTicketsPage } from './pages/tickets/MyTicketsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { CheckInPage } from './pages/checkin/CheckInPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/organizations" element={<OrganizationsListPage />} />
          <Route path="/organizations/new" element={<OrganizationFormPage />} />
          <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/organizations/:id/edit" element={<OrganizationFormPage />} />
          <Route path="/organizations/:id/events/new" element={<EventFormPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:eventId/edit" element={<EventFormPage />} />
          <Route path="/registrations" element={<MyRegistrationsPage />} />
          <Route path="/tickets" element={<MyTicketsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
        {/* Check-in might need a specialized full-screen layout later */}
        <Route path="/checkin/:eventId" element={<CheckInPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
