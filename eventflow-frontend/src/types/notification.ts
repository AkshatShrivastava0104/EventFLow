import type { Pagination } from './common';

export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  status: NotificationStatus;
  created_at: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: Pagination;
}
