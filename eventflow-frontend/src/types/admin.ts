import type { Pagination } from './common';

// Platform super-admin (Owner tier) payloads — GET /admin/*.

export interface PlatformTotals {
  users: number;
  admins: number;
  organizations: number;
  events: number;
  registrations: number;
  tickets: number;
  checkins: number;
}

export interface TrendPoint {
  date: string;
  users: number;
  events: number;
  registrations: number;
}

export interface PlatformStats {
  totals: PlatformTotals;
  events_by_status: Record<string, number>;
  registrations_by_status: Record<string, number>;
  new_users_30d: number;
  new_events_30d: number;
  new_registrations_30d: number;
  checkin_rate: number;
  trend: TrendPoint[];
}

export interface AdminOrganization {
  id: number;
  name: string;
  description: string;
  owner_id: number | null;
  owner_name: string;
  owner_email: string;
  member_count: number;
  event_count: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
  org_count: number;
  registration_count: number;
  created_at: string;
}

export interface PaginatedAdminOrganizations {
  organizations: AdminOrganization[];
  pagination: Pagination;
}

export interface PaginatedAdminUsers {
  users: AdminUser[];
  pagination: Pagination;
}

// Health endpoints live at the root (not under /api/v1).
export interface HealthStatus {
  status: string;
}

export interface ReadyStatus {
  status: string;
  database: string;
  redis: string;
}
