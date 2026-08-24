import api from '@/lib/axios';

export const ticketsApi = {
  create: async (registrationId: number): Promise<{ message: string; ticket_id: number }> => {
    const res = await api.post<{ message: string; ticket_id: number }>(
      `/registrations/${registrationId}/ticket`
    );
    return res.data;
  },
};
