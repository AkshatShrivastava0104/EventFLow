import { get, post, patch, del } from './client';
import type { Organization, OrganizationMember, OrganizationMemberRole } from '@/types/organization';
import type { ListQuery, Paginated } from '@/types/common';

export const organizationsApi = {
  list: (q: ListQuery = {}) =>
    get<Paginated<Organization>>('/organizations', q as Record<string, unknown>),
  get: (id: string) => get<Organization>(`/organizations/${id}`),
  create: (body: { name: string; description?: string }) =>
    post<Organization>('/organizations', body),
  update: (id: string, body: Partial<Organization>) =>
    patch<Organization>(`/organizations/${id}`, body),
  remove: (id: string) => del<void>(`/organizations/${id}`),

  members: {
    list: (orgId: string, q: ListQuery = {}) =>
      get<Paginated<OrganizationMember>>(
        `/organizations/${orgId}/members`,
        q as Record<string, unknown>,
      ),
    add: (orgId: string, body: { email: string; role: OrganizationMemberRole }) =>
      post<OrganizationMember>(`/organizations/${orgId}/members`, body),
    update: (orgId: string, userId: string, body: { role: OrganizationMemberRole }) =>
      patch<OrganizationMember>(`/organizations/${orgId}/members/${userId}`, body),
    remove: (orgId: string, userId: string) =>
      del<void>(`/organizations/${orgId}/members/${userId}`),
  },
};
