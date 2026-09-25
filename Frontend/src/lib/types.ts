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
  status:
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed';
  organizer_id: string;
  organizer_name?: string;
  org_id: number | null;
  tags: string[];
  featured?: boolean;
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
  | 'confirmed'
  | 'cancelled'
  | 'pending'
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
  id: string;
  registration_id: number;
  ticket_code: string;
  attendee_name: string;
  attendee_email: string;
  checked_in: boolean;
  checked_in_at: string | null;
  event?: EventItem;
  registration?: Registration;
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
  user_id: string;
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
  user_id: string;
  user_email: string;
  user_name: string;
  position: number;
  created_at: string;
}