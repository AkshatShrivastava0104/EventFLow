export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface Event {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  venue: string;
  capacity: number;
  available_seats: number;
  registration_deadline: string;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  created_at: string;
  updated_at?: string;
}

export interface EventCreatePayload {
  title: string;
  description?: string;
  venue: string;
  capacity: number;
  registration_deadline: string;
  starts_at: string;
  ends_at: string;
}
