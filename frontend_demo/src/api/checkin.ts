import api from '@/lib/axios';

export interface CheckInResponse {
  message: string;
  checkin_id: number;
}

export const checkinApi = {
  checkIn: async (eventId: number, ticketNumber: string): Promise<CheckInResponse> => {
    const res = await api.post<CheckInResponse>(`/events/${eventId}/checkin`, {
      ticket_number: ticketNumber,
    });
    return res.data;
  },
};
