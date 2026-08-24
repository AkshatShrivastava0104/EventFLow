import api from '@/lib/axios';

export const waitlistApi = {
  join: async (eventId: number): Promise<{ message: string; waitlist_id: number }> => {
    const res = await api.post<{ message: string; waitlist_id: number }>(
      `/events/${eventId}/waitlist`
    );
    return res.data;
  },
};
