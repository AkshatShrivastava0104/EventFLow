export interface Ticket {
  id: number;
  registration_id: number;
  qr_code: string;
  ticket_number: string;
  created_at: string;
}

/** Ticket enriched with event details for the attendee wallet (GET /tickets/me). */
export interface MyTicket {
  id: number;
  registration_id: number;
  qr_code: string;
  ticket_number: string;
  registration_status: string;
  created_at: string;

  event_id: number;
  event_title: string;
  event_venue: string;
  event_status: string;
  event_start: string | null;
  event_end: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}
