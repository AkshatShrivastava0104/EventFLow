export type UserRole =
  | 'user'
  | 'staff'
  | 'admin'
  | 'owner';

export interface EventItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string | null;
  cover_media_url?: string | null;
  cover_media_type?: 'image' | 'video' | string;
  venue: string;
  address: string;
  city: string;
  country: string;
  start_at: string;
  end_at: string;
  price: number;
  currency: string;
  capacity: number;
  registered_count: number;

  // Registration state for the currently authenticated user.
  is_registered?: boolean;

  registration_status?:
  | 'registered'
  | 'pending'
  | 'cancelled'
  | 'waitlisted'
  | null;

  status:
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed';

  organizer_id: string;
  organizer_name?: string;
  org_id: number | null;
  organization_id?: number | null;
  tags: string[];
  featured?: boolean;
  visibility?: string;
  created_at: string;
}

export interface Registration {
  id: number;
  event_id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone?: string;
  ticket_type: string;
  quantity: number;
  total_amount: number;

  status:
  | 'registered'
  | 'confirmed'
  | 'cancelled'
  | 'pending'
  | 'waitlisted'
  | 'waitlist';

  payment_status:
  | 'unpaid'
  | 'paid'
  | 'free'
  | 'refunded';

  payment_id?: string;
  created_at: string;
  event?: EventItem;
}

export interface Ticket {
  id: string | number;
  registration_id: number;

  // Backend ticket fields.
  ticket_number?: string;
  qr_code?: string;

  // Existing frontend-compatible field.
  ticket_code?: string;

  attendee_name?: string;
  attendee_email?: string;
  checked_in: boolean;
  checked_in_at: string | null;

  event?: EventItem;
  registration?: Registration;

  // Backend ticket response fields.
  event_id?: number;
  event_title?: string;
  event_venue?: string;
  event_status?: string;
  event_start?: string;
  event_end?: string;
  registration_status?: string;
  created_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  website: string | null;
  owner_id: string;
  created_at: string;
}

export interface StaffMember {
  id: number;
  org_id: number;
  user_id: string;
  user_email: string;
  user_name: string;

  // Organization-level role only.
  // Platform owner is NOT an organization member role.
  role: 'admin' | 'staff';

  permissions: Record<string, boolean>;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;

  type:
  | 'info'
  | 'success'
  | 'warning'
  | 'event';

  read: boolean;
  link: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: number;
  event_id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  position: number;
  created_at: string;
}

/* =========================================================
   Platform Owner / Admin
   ========================================================= */

export interface AdminRegistrationTicket {
  id: number;
  ticket_number: string;
  qr_code: string;
  created_at: string;
}

export interface AdminRegistrationCheckin {
  id: number;
  ticket_id: number;
  volunteer_id?: number | null;
  volunteer_name?: string;
  volunteer_email?: string;
  checked_in_at: string;
}

export interface AdminRegistrationActivity {
  type:
  | 'registration_created'
  | 'ticket_created'
  | 'checked_in';

  label: string;
  occurred_at: string;
  description?: string;
}

export interface AdminRegistration {
  id: number;

  // Attendee
  user_id: number;
  user_name: string;
  user_email: string;

  // Event
  event_id: number;
  event_title: string;

  // Organization
  organization_id: number;
  organization_name: string;

  // Registration
  registration_status: string;
  payment_status: string;
  registered_at: string;

  // Ticket
  ticket?: AdminRegistrationTicket | null;

  // Check-in
  checkin?: AdminRegistrationCheckin | null;

  // Real persisted activity timeline.
  activity: AdminRegistrationActivity[];
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedAdminRegistrations {
  registrations: AdminRegistration[];
  pagination: AdminPagination;
}

/* =========================================================
   Platform Owner / Admin Waitlist
   ========================================================= */

export interface AdminWaitlistEntry {
  id: number;

  // Attendee
  user_id: number;
  user_name: string;
  user_email: string;

  // Event
  event_id: number;
  event_title: string;

  // Organization
  organization_id: number;
  organization_name: string;

  // Queue
  position: number;
  created_at: string;

  // Event capacity / availability
  event_capacity: number | null;
  registered_count: number;
  available_spots: number | null;

  // Event timing
  event_start_time: string | null;
  event_end_time: string | null;

  // Event state
  event_status: string;

  // Useful safety information
  registration_status: string;
  has_active_registration: boolean;
}

export interface PaginatedAdminWaitlist {
  waitlist: AdminWaitlistEntry[];
  pagination: AdminPagination;
}