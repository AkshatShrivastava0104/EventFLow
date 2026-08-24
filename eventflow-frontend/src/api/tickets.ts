import { get, post } from './client';
import type { MyTicket } from '@/types/ticket';

export const ticketsApi = {
  // Generate a ticket for a confirmed registration.
  create: (registrationId: number) =>
    post<{ message: string; ticket_id: number }>(
      `/registrations/${registrationId}/ticket`,
    ),

  // Attendee wallet — tickets enriched with event details.
  mine: () => get<{ tickets: MyTicket[] }>('/tickets/me'),
};
