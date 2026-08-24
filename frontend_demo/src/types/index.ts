// ============================================================
// EventFlow TypeScript Types
// Exact mirror of backend Go model JSON fields
// ============================================================

// --- Auth ---
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
}

// --- Organization ---
export interface Organization {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  user_id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

// --- Event ---
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface Event {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  venue: string;
  capacity: number | null;
  registration_deadline: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  venue?: string;
  capacity?: number;
  registration_deadline?: string;
  start_time?: string;
  end_time?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  venue?: string;
  capacity?: number;
  registration_deadline?: string;
  start_time?: string;
  end_time?: string;
}

// --- Registration ---
export type RegistrationStatus = 'active' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface RegisterResult {
  status: 'registered' | 'waitlisted';
  registration_id?: number;
  waitlist_id?: number;
}

export interface RegistrationAttendee {
  registration_id: number;
  user_id: number;
  name: string;
  email: string;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

// --- Waitlist ---
export interface WaitlistEntry {
  id: number;
  user_id: number;
  event_id: number;
  position: number;
  created_at: string;
}

// --- Ticket ---
export interface Ticket {
  id: number;
  registration_id: number;
  qr_code: string;
  ticket_number: string;
  created_at: string;
}

// --- Notification ---
export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  status: NotificationStatus;
  created_at: string;
}

// --- Pagination ---
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedEvents {
  events: Event[];
  pagination: Pagination;
}

export interface PaginatedRegistrations {
  registrations: Registration[];
  pagination: Pagination;
}

export interface PaginatedAttendees {
  attendees: RegistrationAttendee[];
  pagination: Pagination;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: Pagination;
}

// --- API Error shape ---
export interface ApiError {
  error: string;
}
