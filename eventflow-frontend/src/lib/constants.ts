export const APP_NAME = 'EventFlow';

export const EVENT_STATUS = {
    draft: { label: 'Draft', tone: 'neutral' },
    published: { label: 'Published', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
    completed: { label: 'Completed', tone: 'info' },
} as const;

export const REGISTRATION_STATUS = {
    registered: { label: 'Registered', tone: 'success' },
    waitlisted: { label: 'Waitlisted', tone: 'warning' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
    attended: { label: 'Attended', tone: 'info' },
} as const;

export const NOTIFICATION_TYPE = {
    registration_confirmed: 'Registration confirmed',
    waitlist_joined: 'Joined waitlist',
    waitlist_promoted: 'Promoted from waitlist',
    registration_cancelled: 'Registration cancelled',
    event_cancelled: 'Event cancelled',
    event_updated: 'Event updated',
    ticket_issued: 'Ticket issued',
} as const;
