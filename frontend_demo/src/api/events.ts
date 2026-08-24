import api from '@/lib/axios';
import type { Event, PaginatedEvents, CreateEventRequest, UpdateEventRequest } from '@/types';

export const eventsApi = {
  create: async (orgId: number, data: CreateEventRequest): Promise<{ message: string; event_id: number }> => {
    const res = await api.post<{ message: string; event_id: number }>(
      `/organizations/${orgId}/events`,
      data
    );
    return res.data;
  },

  listByOrg: async (orgId: number, page = 1, limit = 20): Promise<PaginatedEvents> => {
    const res = await api.get<PaginatedEvents>(`/organizations/${orgId}/events`, {
      params: { page, limit },
    });
    return res.data;
  },

  getById: async (id: number): Promise<Event> => {
    const res = await api.get<Event>(`/events/${id}`);
    return res.data;
  },

  update: async (id: number, data: UpdateEventRequest): Promise<void> => {
    await api.patch(`/events/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  publish: async (id: number): Promise<void> => {
    await api.post(`/events/${id}/publish`);
  },

  cancel: async (id: number): Promise<void> => {
    await api.post(`/events/${id}/cancel`);
  },

  complete: async (id: number): Promise<void> => {
    await api.post(`/events/${id}/complete`);
  },
};
