import { post } from './client';

export const waitlistApi = {
  join: (eventId: number) =>
    post<{ message: string; waitlist_id: number }>(
      `/events/${eventId}/waitlist`,
    ),
};
