import { get, post, patch, del } from './client';
import type { Event, EventCreatePayload } from '@/types/event';
import type { ListQuery, Paginated } from '@/types/common';

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface BackendPaginatedEvents {
  events: Event[];
  pagination: BackendPagination;
}

function normalizePaginatedEvents(
  response: BackendPaginatedEvents,
): Paginated<Event> {
  return {
    data: response.events ?? [],
    meta: {
      page: response.pagination?.page ?? 1,
      page_size: response.pagination?.limit ?? 12,
      total: response.pagination?.total ?? 0,
      total_pages: response.pagination?.total_pages ?? 0,
    },
  };
}

export const eventsApi = {
  list: async (
    q: ListQuery = {},
  ): Promise<Paginated<Event>> => {
    const response =
      await get<BackendPaginatedEvents>(
        '/events',
        q as Record<string, unknown>,
      );

    return normalizePaginatedEvents(response);
  },

  listForOrg: async (
    orgId: string,
    q: ListQuery = {},
  ): Promise<Paginated<Event>> => {
    const response =
      await get<BackendPaginatedEvents>(
        `/organizations/${orgId}/events`,
        q as Record<string, unknown>,
      );

    return normalizePaginatedEvents(response);
  },

  get: (
    id: string,
  ) =>
    get<Event>(
      `/events/${id}`,
    ),

  create: (
    orgId: string,
    body: EventCreatePayload,
  ) =>
    post<Event>(
      `/organizations/${orgId}/events`,
      body,
    ),

  update: (
    id: string,
    body: Partial<EventCreatePayload>,
  ) =>
    patch<Event>(
      `/events/${id}`,
      body,
    ),

  remove: (
    id: string,
  ) =>
    del<void>(
      `/events/${id}`,
    ),

  publish: (
    id: string,
  ) =>
    post<Event>(
      `/events/${id}/publish`,
    ),

  cancel: (
    id: string,
  ) =>
    post<Event>(
      `/events/${id}/cancel`,
    ),

  complete: (
    id: string,
  ) =>
    post<Event>(
      `/events/${id}/complete`,
    ),
};