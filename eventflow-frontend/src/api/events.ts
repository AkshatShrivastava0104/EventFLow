import { get, post, patch, del } from './client';
import type {
  EventItem,
  PaginatedEvents,
  EventPayload,
  EventLifecycleAction,
} from '@/types/event';

export interface BrowseParams {
  page?: number;
  page_size?: number;
  status?: string;
  order?: 'asc' | 'desc';
}

export const eventsApi = {
  // Global discovery feed. Any authenticated user can browse.
  browse: (params?: BrowseParams) => get<PaginatedEvents>('/events', params),

  // Events scoped to a single organization (workspace view).
  listByOrg: (orgId: number, params?: { page?: number; limit?: number }) =>
    get<PaginatedEvents>(`/organizations/${orgId}/events`, params),

  get: (id: number) => get<EventItem>(`/events/${id}`),

  create: (orgId: number, payload: EventPayload) =>
    post<{ message: string; event_id: number }>(
      `/organizations/${orgId}/events`,
      payload,
    ),

  update: (id: number, payload: EventPayload) =>
    patch<{ message: string }>(`/events/${id}`, payload),

  remove: (id: number) => del<{ message: string }>(`/events/${id}`),

  // publish | cancel | complete
  transition: (id: number, action: EventLifecycleAction) =>
    post<{ message: string }>(`/events/${id}/${action}`),
};
