import { get, post } from './client';
import type { Ticket } from '@/types/ticket';
import type { ListQuery, Paginated } from '@/types/common';

export const ticketsApi = {
  list: (q: ListQuery = {}) =>
    get<Paginated<Ticket>>('/tickets', q as Record<string, unknown>),
  mine: () => get<Ticket[]>('/tickets/mine'),
  issue: (registrationId: string) =>
    post<Ticket>(`/registrations/${registrationId}/ticket`),
  get: (id: string) => get<Ticket>(`/tickets/${id}`),
};
