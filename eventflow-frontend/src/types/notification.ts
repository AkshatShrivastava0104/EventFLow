export type NotificationType =
  | 'registration_confirmed'
  | 'waitlist_joined'
  | 'waitlist_promoted'
  | 'registration_cancelled'
  | 'event_cancelled'
  | 'event_updated'
  | 'ticket_issued';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
}
