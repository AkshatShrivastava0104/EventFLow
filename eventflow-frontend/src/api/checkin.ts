import { post } from './client';

export const checkinApi = {
  // Volunteer/organizer scans a ticket number to check an attendee in.
  checkIn: (eventId: number, ticketNumber: string) =>
    post<{ message: string; checkin_id: number }>(
      `/events/${eventId}/checkin`,
      { ticket_number: ticketNumber },
    ),
};
