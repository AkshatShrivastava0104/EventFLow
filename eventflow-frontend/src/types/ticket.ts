export interface Ticket {
  id: string;
  registration_id: string;
  ticket_number: string;
  qr_payload: string;
  issued_at: string;
  // Optional denormalized data
  attendee?: { id: string; name: string; email: string };
  event?: { id: string; title: string; venue: string; starts_at: string; ends_at: string };
}
