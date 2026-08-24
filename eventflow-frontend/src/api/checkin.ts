import { post } from './client';
import type { Registration } from '@/types/registration';

export interface CheckInPayload {
  ticket_number?: string;
  qr_payload?: string;
}

export interface CheckInResult {
  registration: Registration;
  ticket?: { id: string; ticket_number: string };
  attendee?: { id: string; name: string; email: string };
  event?: { id: string; title: string };
}

export const checkinApi = {
  checkIn: (eventId: string, payload: CheckInPayload) =>
    post<CheckInResult>(`/events/${eventId}/checkin`, payload),
};
