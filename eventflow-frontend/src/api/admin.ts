import { get } from './client';
import type {
  PlatformStats,
  PaginatedAdminOrganizations,
  PaginatedAdminUsers,
} from '@/types/admin';

export interface AdminListParams {
  search?: string;
  page?: number;
  limit?: number;
}

// Platform super-admin endpoints. Require a JWT with the "admin" system role.
export const adminApi = {
  stats: () => get<PlatformStats>('/admin/stats'),

  organizations: (params?: AdminListParams) =>
    get<PaginatedAdminOrganizations>('/admin/organizations', params),

  users: (params?: AdminListParams) =>
    get<PaginatedAdminUsers>('/admin/users', params),
};
