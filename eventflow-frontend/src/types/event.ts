import type { Pagination } from './common';

// Named `EventItem` to avoid shadowing the DOM's global `Event` type.

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface EventItem {
  id: number;
  organization_id: number;
  title: string;
  description: string;
  venue: string;
  capacity: number | null;
  registration_deadline: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedEvents {
  events: EventItem[];
  pagination: Pagination;
}

/** Body for POST (create) and PATCH (update). All optional except title. */
export interface EventPayload {
  title: string;
  description?: string;
  venue?: string;
  capacity?: number | null;
  registration_deadline?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export type EventLifecycleAction = 'publish' | 'cancel' | 'complete';
