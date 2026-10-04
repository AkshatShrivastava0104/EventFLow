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
  const coverImage =
    event?.cover_image ??
    event?.cover_media_url ??
    '';

  const coverMediaUrl =
    event?.cover_media_url ??
    event?.cover_image ??
    '';

  return {
    ...event,

    currency: 'INR',

    start_at:
      event?.start_at ??
      event?.start_time ??
      null,

    end_at:
      event?.end_at ??
      event?.end_time ??
      null,

    price:
      event?.price !== undefined &&
        event?.price !== null
        ? Number(event.price)
        : 0,

    category:
      event?.category ??
      null,

    /*
     * Backend stores the uploaded image path
     * in cover_image.
     */
    cover_image: coverImage,

    cover_media_url: coverMediaUrl,

    /*
     * Image uploads only.
     */
    cover_media_type: 'image',

    /*
     * Registration state for the currently
     * authenticated user.
     */
    is_registered:
      event?.is_registered ??
      event?.registered ??
      event?.user_registered ??
      false,

    registration_status:
      event?.registration_status ??
      event?.user_registration_status ??
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

function normalizeRegistration(
  registration: any,
): Registration {
  return {
    ...registration,

    id: Number(registration?.id ?? 0),

    event_id: Number(
      registration?.event_id ??
      registration?.eventId ??
      0,
    ),

    status:
      registration?.status ??
      'pending',

    payment_status:
      registration?.payment_status ??
      'unpaid',
  } as Registration;
}

function normalizeRegistrations(
  response: any,
): Registration[] {
  const registrations = normalizeArray<any>(
    response,
    ['registrations'],
  );

  return registrations.map(
    normalizeRegistration,
  );
}

function normalizeTicket(ticket: any): Ticket {
  return {
    ...ticket,

    id:
      ticket?.id ??
      ticket?.ticket_id ??
      '',

    registration_id: Number(
      ticket?.registration_id ??
      ticket?.registrationId ??
      0,
    ),

    ticket_number:
      ticket?.ticket_number ??
      ticket?.ticket_code ??
      '',

    ticket_code:
      ticket?.ticket_code ??
      ticket?.ticket_number ??
      '',

    qr_code:
      ticket?.qr_code ??
      ticket?.qrCode ??
      '',

    qr_code_url:
      ticket?.qr_code_url ??
      ticket?.qrCodeUrl ??
      '',

    checked_in:
      Boolean(
        ticket?.checked_in ??
        ticket?.checkedIn ??
        ticket?.checked_in_at,
      ),

    checked_in_at:
      ticket?.checked_in_at ??
      ticket?.checkedInAt ??
      null,

    registration_status:
      ticket?.registration_status ??
      ticket?.registrationStatus ??
      'registered',
  } as Ticket;
}

function normalizeTickets(
  response: any,
): Ticket[] {
  const tickets = normalizeArray<any>(
    response,
    ['tickets'],
  );

  return tickets.map(normalizeTicket);
}

/* =========================================================
   Events
   ========================================================= */

export const EventsAPI = {
  // GET /api/v1/events
  //
  // Global event discovery.
  // Used for published event listing.
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
      await api.post(
        `/organizations/${organizationId}/events`,
        body,
      );

    /*
     * Backend CreateEvent currently returns:
     *
     * {
     *   message: "event created successfully",
     *   event_id: 123
     * }
     */
    if (
      response.data &&
      response.data.event_id !== undefined
    ) {
      return normalizeEvent({
        ...response.data,
        id: response.data.event_id,
      });
    }

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
      await api.patch(
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

  /*
   * =======================================================
   * Event Media Upload
   * =======================================================
   *
   * Image only.
   */
  uploadMedia: async (
    eventId: number | string,
    file: File,
  ) => {
    if (!file) {
      throw new Error(
        'Image file is required',
      );
    }

    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]);

    if (!allowedTypes.has(file.type)) {
      throw new Error(
        'Only JPG, PNG, WEBP, and GIF images are allowed.',
      );
    }

    const formData = new FormData();

    formData.append(
      'file',
      file,
    );

    const response = await api.post(
      `/events/${eventId}/media`,
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      },
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

    return normalizeRegistrations(
      response.data,
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

    return normalizeRegistration(
      response.data,
    );
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
   Admin / Platform Owner
   ========================================================= */

export type AuditLogFilters = {
  search?: string;
  action?: string;
  entity?: string;
  page?: number;
  limit?: number;
};

export const AuditLogsAPI = {
  // GET /api/v1/audit-logs
  // Platform-owner only.
  list: async (
    params: AuditLogFilters = {},
  ) => {
    const response = await api.get(
      '/audit-logs',
      {
        params: {
          ...params,
          page: params.page ?? 1,
          limit: params.limit ?? 25,
        },
      },
    );

    return response.data;
  },

  // GET /api/v1/audit-logs/:id
  // Platform-owner only.
  get: async (
    id: number | string,
  ) => {
    const response = await api.get(
      `/audit-logs/${id}`,
    );

    return response.data;
  },
};

export type AdminRegistrationFilters = {
  search?: string;
  event_id?: number | string;
  organization_id?: number | string;
  status?: string;
  payment_status?: string;
  checkin?: 'checked_in' | 'not_checked_in' | '';
  from?: string;
  to?: string;
  sort?:
  | 'newest'
  | 'oldest'
  | 'attendee_asc'
  | 'attendee_desc'
  | 'event_asc'
  | 'event_desc'
  | 'checkin_latest';
  page?: number;
  limit?: number;
};

export const AdminAPI = {
  // GET /api/v1/admin/registrations
  //
  // Platform-owner only.
  // Returns registration + attendee + event + organization +
  // ticket + check-in + activity information.
  listRegistrations: async (
    params: AdminRegistrationFilters = {},
  ) => {
    const response = await api.get(
      '/admin/registrations',
      {
        params: {
          ...params,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      },
    );

    return response.data;
  },

  // GET /api/v1/admin/organizations
  listOrganizations: async (
    params: Record<string, any> = {},
  ) => {
    const response = await api.get(
      '/admin/organizations',
      { params },
    );

    return response.data;
  },

  // GET /api/v1/admin/users
  listUsers: async (
    params: Record<string, any> = {},
  ) => {
    const response = await api.get(
      '/admin/users',
      { params },
    );

    return response.data;
  },

  // GET /api/v1/admin/waitlist
  //
  // Platform-owner only.
  // Returns platform-wide waitlist entries with:
  // attendee + event + organization + queue position +
  // capacity + registered count + available spots.
  listWaitlist: async (
    params: {
      search?: string;
      event_id?: number | string;
      organization_id?: number | string;
      sort?:
      | 'position_asc'
      | 'position_desc'
      | 'newest'
      | 'oldest'
      | 'attendee_asc'
      | 'attendee_desc'
      | 'event_asc'
      | 'event_desc';
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const response = await api.get(
      '/admin/waitlist',
      {
        params: {
          ...params,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      },
    );

    return response.data;
  },

  // POST /api/v1/admin/waitlist/events/:eventId/promote
  promoteNextWaitlistUser: async (
    eventId: number | string,
  ) => {
    const response = await api.post(
      `/admin/waitlist/events/${eventId}/promote`,
    );

    return response.data;
  },

  // POST /api/v1/admin/waitlist/:waitlistId/promote
  promoteWaitlistUser: async (
    waitlistId: number | string,
  ) => {
    const response = await api.post(
      `/admin/waitlist/${waitlistId}/promote`,
    );

    return response.data;
  },

  // DELETE /api/v1/admin/waitlist/:waitlistId
  removeWaitlistUser: async (
    waitlistId: number | string,
  ) => {
    const response = await api.delete(
      `/admin/waitlist/${waitlistId}`,
    );

    return response.data;
  },

  // GET /api/v1/admin/stats
  stats: async () => {
    const response = await api.get(
      '/admin/stats',
    );

    return response.data;
  },
};

/* =========================================================
   System Health
   ========================================================= */

export interface SystemHealthComponent {
  status: string;
  latency_ms: number;
  message?: string;
  last_checked: string;
}

export interface SystemHealth {
  status: string;
  environment: string;
  app_name: string;
  timestamp: string;
  database: SystemHealthComponent;
  redis: SystemHealthComponent;
  api: SystemHealthComponent;
}

export interface SystemHealthResponse {
  health: SystemHealth;
}

export const SystemHealthAPI = {
  // GET /api/v1/system-health
  //
  // Platform-owner only.
  // Checks API, PostgreSQL and Redis health.
  get: async (): Promise<SystemHealthResponse> => {
    const response =
      await api.get<SystemHealthResponse>(
        '/system-health',
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

    return normalizeTickets(
      response.data,
    );
  },

  // GET /api/v1/tickets/:id
  get: async (
    id: number | string,
  ): Promise<Ticket> => {
    const response = await api.get(
      `/tickets/${id}`,
    );

    // Backend returns:
    // {
    //   ticket: { ... }
    // }
    //
    // Normalize the actual ticket object.
    const ticketData =
      response.data?.ticket ??
      response.data;

    return normalizeTicket(
      ticketData,
    );
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
  //
  // Kept for backwards compatibility.
  // Normal free registration now creates its ticket
  // automatically on the backend.
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
    }>(
      '/notifications/unread-count',
    );

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

export type AnalyticsRange =
  | '7d'
  | '15d'
  | '30d'
  | '90d'
  | '6m'
  | '12m';

export const StatsAPI = {
  // GET /api/v1/stats/platform
  //
  // Platform-wide analytics.
  //
  // Supported ranges:
  //   7d  = last 7 days
  //   15d = last 15 days
  //   30d = last 30 days
  //   90d = last 90 days
  //   6m  = last 6 months
  //   12m = last 12 months
  //
  // Default:
  //   30d
  platform: async (
    range: AnalyticsRange = '30d',
  ) => {
    const response = await api.get(
      '/stats/platform',
      {
        params: {
          range,
        },
      },
    );

    return response.data;
  },

  // GET /api/v1/organizations/:organizationId/stats
  //
  // Organization-scoped analytics.
  organization: async (
    organizationId: number | string,
    range: AnalyticsRange = '30d',
  ) => {
    const response = await api.get(
      `/organizations/${organizationId}/stats`,
      {
        params: {
          range,
        },
      },
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
  createIntent: async (payload: {
    purpose?: 'event' | 'subscription';
    event_id?: number;
    quantity?: number;
    organization_name?: string;
  }) => {
    const response = await api.post(
      '/payments/intents',
      payload,
    );
    return response.data;
  },

  confirm: async (payload: {
    order_id: string;
    test_card_last_four: string;
  }) => {
    const response = await api.post(
      `/payments/intents/${encodeURIComponent(payload.order_id)}/confirm`,
      { test_card_last_four: payload.test_card_last_four },
    );
    return response.data;
  },

  organization: async (
    organizationId: number | string,
  ) => {
    const response = await api.get(
      `/organizations/${organizationId}/payments`,
    );
    return response.data;
  },
};