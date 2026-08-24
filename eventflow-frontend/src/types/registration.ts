export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended';

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  waitlist_position?: number | null;
  ticket_id?: string | null;
  checked_in_at?: string | null;
  created_at: string;
  // Convenient expanded fields, if backend provides them
  user?: { id: string; name: string; email: string };
  event?: { id: string; title: string; starts_at: string; venue: string };
}
