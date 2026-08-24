import type { Pagination } from './common';

// Registration status is persisted as 'pending' | 'cancelled' by the backend;
// keep the field a plain string so unexpected values still render.

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface PaginatedRegistrations {
  registrations: Registration[];
  pagination: Pagination;
}

/** Response of POST /events/:id/register — either a registration or waitlist. */
export interface RegisterResult {
  status: string;
  registration_id?: number;
  waitlist_id?: number;
}

export interface Attendee {
  registration_id: number;
  user_id: number;
  name: string;
  email: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface PaginatedAttendees {
  attendees: Attendee[];
  pagination: Pagination;
}
