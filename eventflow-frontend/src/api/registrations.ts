import { get, post, del } from './client';
import type { Registration } from '@/types/registration';
import type { ListQuery, Paginated } from '@/types/common';

export const registrationsApi = {
  mine: (q: ListQuery = {}) =>
    get<Paginated<Registration>>('/registrations/me', q as Record<string, unknown>),
  forEvent: (eventId: string, q: ListQuery = {}) =>
    get<Paginated<Registration>>(
      `/events/${eventId}/registrations`,
      q as Record<string, unknown>,
    ),
  register: (eventId: string) => post<Registration>(`/events/${eventId}/register`),
  cancel: (registrationId: string) =>
    del<void>(`/registrations/${registrationId}`),
};
