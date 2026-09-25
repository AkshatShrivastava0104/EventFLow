import api from './api';
import type {
  EventItem,
  Registration,
  Ticket,
  Organization,
  StaffMember,
  NotificationItem,
  WaitlistEntry,
} from './types';

/* =========================================================
   Helpers
========================================================= */

function normalizeArray<T>(
  response: any,
  keys: string[] = [],
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    for (const key of keys) {
      if (Array.isArray(response[key])) {
        return response[key];
      }
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }
  }

  return [];
}

/*
 * Backend event fields:
 *   start_time
 *   end_time
 *
 * Frontend older UI fields:
 *   start_at
 *   end_at
 *
 * Normalize them here so every screen gets the same shape.
 */
function normalizeEvent(event: any): EventItem {
  return {
    ...event,

    start_at:
      event.start_at ??
      event.start_time ??
      null,

    end_at:
      event.end_at ??
      event.end_time ??
      null,

    price:
      event.price !== undefined &&
        event.price !== null
        ? Number(event.price)
        : 0,

    category:
      event.category ??
      null,
  } as EventItem;
}

function normalizeEvents(
  response: any,
): EventItem[] {
  const events = normalizeArray<any>(
    response,
    ['events'],
  );

  return events.map(normalizeEvent);
}

/* =========================================================
   Events
========================================================= */

export const EventsAPI = {
  // GET /api/v1/events
  //
  // Global event discovery.
  // Used for public/published event listing.
  list: async (
    params: Record<string, any> = {},
  ): Promise<EventItem[]> => {
    const response = await api.get(
      '/events',
      { params },
    );

    return normalizeEvents(
      response.data,
    );
  },

  // GET /api/v1/organizations/:organizationId/events
  //
  // Organization-scoped event listing.
  // Used by ADMIN/STAFF dashboards.
  listByOrganization: async (
    organizationId: number | string,
    params: Record<string, any> = {},
  ): Promise<EventItem[]> => {
    const response = await api.get(
      `/organizations/${organizationId}/events`,
      { params },
    );

    return normalizeEvents(
      response.data,
    );
  },

  // GET /api/v1/events/:id
  get: async (
    id: number | string,
  ): Promise<EventItem> => {
    const response = await api.get(
      `/events/${id}`,
    );

    return normalizeEvent(
      response.data,
    );
  },

  // POST /api/v1/organizations/:organizationId/events
  create: async (
    payload: Partial<EventItem>,
  ): Promise<EventItem> => {
    const organizationId =
      (payload as any).organization_id ??
      (payload as any).organizationId;

    if (!organizationId) {
      throw new Error(
        'organization_id is required to create an event',
      );
    }

    const body = { ...payload };

    delete (body as any).organization_id;
    delete (body as any).organizationId;

    const response =
      await api.post<EventItem>(
        `/organizations/${organizationId}/events`,
        body,
      );

    return normalizeEvent(
      response.data,
    );
  },

  // PATCH /api/v1/events/:id
  update: async (
    id: number | string,
    payload: Partial<EventItem>,
  ): Promise<EventItem> => {
    const response =
      await api.patch<EventItem>(
        `/events/${id}`,
        payload,
      );

    return normalizeEvent(
      response.data,
    );
  },

  // DELETE /api/v1/events/:id
  remove: async (
    id: number | string,
  ) => {
    const response = await api.delete(
      `/events/${id}`,
    );

    return response.data;
  },

  // POST /api/v1/events/:id/publish
  publish: async (
    id: number | string,
  ) => {
    const response = await api.post(
      `/events/${id}/publish`,
    );

    return response.data;
  },

  // POST /api/v1/events/:id/cancel
  cancel: async (
    id: number | string,
  ) => {
    const response = await api.post(
      `/events/${id}/cancel`,
    );

    return response.data;
  },

  // POST /api/v1/events/:id/complete
  complete: async (
    id: number | string,
  ) => {
    const response = await api.post(
      `/events/${id}/complete`,
    );

    return response.data;
  },
};

/* =========================================================
   Registrations
========================================================= */

export const RegistrationsAPI = {
  // GET /api/v1/registrations/me
  list: async (
    params: Record<string, any> = {},
  ): Promise<Registration[]> => {
    const response = await api.get(
      '/registrations/me',
      { params },
    );

    return normalizeArray<Registration>(
      response.data,
      ['registrations'],
    );
  },

  // GET /api/v1/registrations/:id
  get: async (
    id: number | string,
  ): Promise<Registration> => {
    const response =
      await api.get<Registration>(
        `/registrations/${id}`,
      );

    return response.data;
  },

  // POST /api/v1/events/:eventId/register
  create: async (
    payload: Partial<Registration> & {
      event_id?: number | string;
      eventId?: number | string;
    },
  ) => {
    const eventId =
      payload.event_id ??
      payload.eventId;

    if (!eventId) {
      throw new Error(
        'event_id is required to create a registration',
      );
    }

    const body = { ...payload };

    delete (body as any).event_id;
    delete (body as any).eventId;

    const response = await api.post(
      `/events/${eventId}/register`,
      body,
    );

    return response.data;
  },

  // DELETE /api/v1/registrations/:id
  cancel: async (
    id: number | string,
  ) => {
    const response =
      await api.delete(
        `/registrations/${id}`,
      );

    return response.data;
  },
};

/* =========================================================
   Tickets
========================================================= */

export const TicketsAPI = {
  // GET /api/v1/tickets/me
  list: async (
    params: Record<string, any> = {},
  ): Promise<Ticket[]> => {
    const response = await api.get(
      '/tickets/me',
      { params },
    );

    return normalizeArray<Ticket>(
      response.data,
      ['tickets'],
    );
  },

  // GET /api/v1/tickets/:id
  get: async (
    id: number | string,
  ): Promise<Ticket> => {
    const response =
      await api.get<Ticket>(
        `/tickets/${id}`,
      );

    return response.data;
  },

  // POST /api/v1/events/:eventId/checkin
  checkin: async (
    eventId: number | string,
    code: string,
  ) => {
    const response = await api.post(
      `/events/${eventId}/checkin`,
      {
        ticket_number: code,
      },
    );

    return response.data;
  },

  // POST /api/v1/registrations/:registrationId/ticket
  create: async (
    registrationId: number | string,
  ) => {
    const response = await api.post(
      `/registrations/${registrationId}/ticket`,
    );

    return response.data;
  },
};

/* =========================================================
   Organizations
========================================================= */

export const OrgsAPI = {
  // GET /api/v1/organizations
  list: async (
    params: Record<string, any> = {},
  ): Promise<Organization[]> => {
    const response = await api.get(
      '/organizations',
      { params },
    );

    return normalizeArray<Organization>(
      response.data,
      ['organizations'],
    );
  },

  // GET /api/v1/organizations/:id
  get: async (
    id: number | string,
  ): Promise<Organization> => {
    const response =
      await api.get<Organization>(
        `/organizations/${id}`,
      );

    return response.data;
  },

  // POST /api/v1/organizations
  create: async (
    payload: Partial<Organization>,
  ): Promise<Organization> => {
    const response =
      await api.post<Organization>(
        '/organizations',
        payload,
      );

    return response.data;
  },

  // PATCH /api/v1/organizations/:id
  update: async (
    id: number | string,
    payload: Partial<Organization>,
  ): Promise<Organization> => {
    const response =
      await api.patch<Organization>(
        `/organizations/${id}`,
        payload,
      );

    return response.data;
  },

  // DELETE /api/v1/organizations/:id
  remove: async (
    id: number | string,
  ) => {
    const response = await api.delete(
      `/organizations/${id}`,
    );

    return response.data;
  },
};

/* =========================================================
   Staff / Organization Members
========================================================= */

export const StaffAPI = {
  // GET /api/v1/organizations/:organizationId/members
  list: async (
    organizationId: number | string,
    params: Record<string, any> = {},
  ): Promise<StaffMember[]> => {
    const response = await api.get(
      `/organizations/${organizationId}/members`,
      { params },
    );

    return normalizeArray<StaffMember>(
      response.data,
      ['members', 'staff'],
    );
  },

  // POST /api/v1/organizations/:organizationId/members
  create: async (
    organizationId: number | string,
    payload: Partial<StaffMember>,
  ) => {
    const response = await api.post(
      `/organizations/${organizationId}/members`,
      payload,
    );

    return response.data;
  },

  // PATCH /api/v1/organizations/:organizationId/members/:userId
  update: async (
    organizationId: number | string,
    userId: number | string,
    payload: Partial<StaffMember>,
  ) => {
    const response = await api.patch(
      `/organizations/${organizationId}/members/${userId}`,
      payload,
    );

    return response.data;
  },

  // DELETE /api/v1/organizations/:organizationId/members/:userId
  remove: async (
    organizationId: number | string,
    userId: number | string,
  ) => {
    const response = await api.delete(
      `/organizations/${organizationId}/members/${userId}`,
    );

    return response.data;
  },
};

/* =========================================================
   Notifications
========================================================= */

export const NotificationsAPI = {
  // GET /api/v1/notifications
  list: async (
    params: Record<string, any> = {},
  ): Promise<NotificationItem[]> => {
    const response = await api.get(
      '/notifications',
      { params },
    );

    return normalizeArray<NotificationItem>(
      response.data,
      ['notifications'],
    );
  },

  // PATCH /api/v1/notifications/:id/read
  markRead: async (
    id: number | string,
  ) => {
    const response =
      await api.patch(
        `/notifications/${id}/read`,
      );

    return response.data;
  },

  // PATCH /api/v1/notifications/read-all
  markAllRead: async () => {
    const response =
      await api.patch(
        '/notifications/read-all',
      );

    return response.data;
  },

  // Backend-side notification creation
  create: async (
    payload: Partial<NotificationItem>,
  ) => {
    const response = await api.post(
      '/notifications',
      payload,
    );

    return response.data;
  },

  // GET /api/v1/notifications/unread-count
  unreadCount: async (): Promise<number> => {
    const response = await api.get<{
      count?: number;
      unread_count?: number;
    }>('/notifications/unread-count');

    return Number(
      response.data.count ??
      response.data.unread_count ??
      0,
    );
  },
};

/* =========================================================
   Waitlist
========================================================= */

export const WaitlistAPI = {
  // POST /api/v1/events/:eventId/waitlist
  join: async (
    eventId: number | string,
    payload: Partial<WaitlistEntry> = {},
  ) => {
    const response = await api.post(
      `/events/${eventId}/waitlist`,
      payload,
    );

    return response.data;
  },

  // GET /api/v1/waitlist
  list: async (
    params: Record<string, any> = {},
  ): Promise<WaitlistEntry[]> => {
    const response = await api.get(
      '/waitlist',
      { params },
    );

    return normalizeArray<WaitlistEntry>(
      response.data,
      ['waitlist', 'entries'],
    );
  },

  // DELETE /api/v1/waitlist/:id
  remove: async (
    id: number | string,
  ) => {
    const response =
      await api.delete(
        `/waitlist/${id}`,
      );

    return response.data;
  },
};

/* =========================================================
   Stats
========================================================= */

export const StatsAPI = {
  // GET /api/v1/stats/platform
  platform: async () => {
    const response = await api.get(
      '/stats/platform',
    );

    return response.data;
  },

  // GET /api/v1/organizations/:organizationId/stats
  organization: async (
    organizationId: number | string,
  ) => {
    const response = await api.get(
      `/organizations/${organizationId}/stats`,
    );

    return response.data;
  },

  // GET /api/v1/organizations/:organizationId/operations/stats
  operations: async (
    organizationId: number | string,
  ) => {
    const response = await api.get(
      `/organizations/${organizationId}/operations/stats`,
    );

    return response.data;
  },
};

/* =========================================================
   Payments
========================================================= */

export const PaymentsAPI = {
  /*
   * IMPORTANT:
   * These are still frontend-only mock payments.
   * They are NOT connected to Razorpay/Stripe/your Go backend yet.
   *
   * Keep this temporarily so existing payment UI does not break.
   */

  createIntent: async (payload: {
    amount: number;
    currency: string;
    event_id: number;
  }) => {
    await new Promise((resolve) =>
      setTimeout(resolve, 800),
    );

    return {
      order_id:
        'ord_' +
        Math.random()
          .toString(36)
          .slice(2, 12),

      client_secret:
        'sec_' +
        Math.random()
          .toString(36)
          .slice(2, 20),

      ...payload,
    };
  },

  confirm: async (payload: {
    order_id: string;
    card?: string;
  }) => {
    await new Promise((resolve) =>
      setTimeout(resolve, 1400),
    );

    if (
      payload.card &&
      payload.card
        .replace(/\s/g, '')
        .endsWith('0002')
    ) {
      throw new Error(
        'Card declined. Try a different payment method.',
      );
    }

    return {
      payment_id:
        'pay_' +
        Math.random()
          .toString(36)
          .slice(2, 14),

      status: 'succeeded',
    };
  },
};