import api from '@/lib/axios';
import type { PaginatedRegistrations, PaginatedAttendees, RegisterResult } from '@/types';

export const registrationsApi = {
  register: async (eventId: number): Promise<RegisterResult> => {
    const res = await api.post<RegisterResult>(`/events/${eventId}/register`);
    return res.data;
  },

  getMyRegistrations: async (page = 1, limit = 20): Promise<PaginatedRegistrations> => {
    const res = await api.get<PaginatedRegistrations>('/registrations/me', {
      params: { page, limit },
    });
    return res.data;
  },

  cancel: async (registrationId: number): Promise<void> => {
    await api.delete(`/registrations/${registrationId}`);
  },

  getEventRegistrations: async (
    eventId: number,
    page = 1,
    limit = 20
  ): Promise<PaginatedAttendees> => {
    const res = await api.get<PaginatedAttendees>(`/events/${eventId}/registrations`, {
      params: { page, limit },
    });
    return res.data;
  },
};
