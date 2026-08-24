import { post } from './client';
import type { Registration } from '@/types/registration';

export const waitlistApi = {
  join: (eventId: string) => post<Registration>(`/events/${eventId}/waitlist`),
};
