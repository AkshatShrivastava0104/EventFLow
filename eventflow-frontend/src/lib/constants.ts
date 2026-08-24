import type { EventStatus } from '@/types/event';
import type { MemberRole } from '@/types/organization';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent';

export const APP_NAME = 'EventFlow';

// --- Events ---------------------------------------------------------------

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; tone: BadgeTone }
> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  completed: { label: 'Completed', tone: 'info' },
};

export const EVENT_STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// --- Registrations --------------------------------------------------------
// Status is a free-form string on the wire; fall back to neutral for unknowns.

export const REGISTRATION_STATUS_META: Record<
  string,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: 'Pending', tone: 'warning' },
  registered: { label: 'Registered', tone: 'success' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  waitlisted: { label: 'Waitlisted', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export function registrationStatusMeta(status: string) {
  return (
    REGISTRATION_STATUS_META[status.toLowerCase()] ?? {
      label: status || 'Unknown',
      tone: 'neutral' as BadgeTone,
    }
  );
}

export const PAYMENT_STATUS_META: Record<
  string,
  { label: string; tone: BadgeTone }
> = {
  paid: { label: 'Paid', tone: 'success' },
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'info' },
  free: { label: 'Free', tone: 'neutral' },
};

export function paymentStatusMeta(status: string) {
  return (
    PAYMENT_STATUS_META[status.toLowerCase()] ?? {
      label: status || '—',
      tone: 'neutral' as BadgeTone,
    }
  );
}

// --- Membership -----------------------------------------------------------

export const MEMBER_ROLE_META: Record<
  MemberRole,
  { label: string; tone: BadgeTone }
> = {
  OWNER: { label: 'Owner', tone: 'accent' },
  ADMIN: { label: 'Admin', tone: 'info' },
  MEMBER: { label: 'Member', tone: 'neutral' },
  VOLUNTEER: { label: 'Volunteer', tone: 'success' },
};

// Roles the UI lets you assign (OWNER is implicit / not assignable here).
export const ASSIGNABLE_ROLE_OPTIONS: { label: string; value: MemberRole }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
  { label: 'Volunteer', value: 'VOLUNTEER' },
];

// --- Misc -----------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 12;

// Hex colours for charts (Tailwind palette values), keyed by status.
export const EVENT_STATUS_COLOR: Record<string, string> = {
  draft: '#a1a1aa',
  published: '#10b981',
  cancelled: '#ef4444',
  completed: '#2563eb',
};

export const REGISTRATION_STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  registered: '#10b981',
  confirmed: '#10b981',
  waitlisted: '#2563eb',
  cancelled: '#ef4444',
};

export const CHART_COLOR = {
  accent: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#a1a1aa',
} as const;
