import { get, post, patch, del } from './client';
import type {
  Organization,
  OrganizationMember,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
  AddMemberPayload,
  UpdateMemberPayload,
} from '@/types/organization';

export const organizationsApi = {
  list: () => get<{ organizations: Organization[] }>('/organizations'),

  get: (id: number) => get<Organization>(`/organizations/${id}`),

  create: (payload: CreateOrganizationPayload) =>
    post<{ message: string; organization_id: number }>(
      '/organizations',
      payload,
    ),

  update: (id: number, payload: UpdateOrganizationPayload) =>
    patch<{ message: string }>(`/organizations/${id}`, payload),

  remove: (id: number) => del<{ message: string }>(`/organizations/${id}`),

  members: (id: number) =>
    get<{ members: OrganizationMember[] }>(`/organizations/${id}/members`),

  addMember: (id: number, payload: AddMemberPayload) =>
    post<{ message: string }>(`/organizations/${id}/members`, payload),

  updateMember: (id: number, userId: number, payload: UpdateMemberPayload) =>
    patch<{ message: string }>(
      `/organizations/${id}/members/${userId}`,
      payload,
    ),

  removeMember: (id: number, userId: number) =>
    del<{ message: string }>(`/organizations/${id}/members/${userId}`),
};
