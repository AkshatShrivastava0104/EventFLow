import { get, post, del } from './client';
import type {
  PaginatedRegistrations,
  PaginatedAttendees,
} from '@/types/registration';

// POST /events/:id/register responds with a registration OR waitlist id.
export interface RegisterResponse {
  message: string;
  registration_id?: number;
  waitlist_id?: number;
}

export const registrationsApi = {
  register: (eventId: number) =>
    post<RegisterResponse>(`/events/${eventId}/register`),

  mine: (params?: { page?: number; limit?: number }) =>
    get<PaginatedRegistrations>('/registrations/me', params),

  cancel: (registrationId: number) =>
    del<{ message: string }>(`/registrations/${registrationId}`),

  // Organizer-facing attendee list for a single event.
  forEvent: (eventId: number, params?: { page?: number; limit?: number }) =>
    get<PaginatedAttendees>(`/events/${eventId}/registrations`, params),
};
