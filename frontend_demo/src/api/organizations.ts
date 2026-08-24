import api from '@/lib/axios';
import type { Organization, OrganizationMember } from '@/types';

export const organizationsApi = {
  create: async (data: { name: string; description?: string }): Promise<Organization> => {
    const res = await api.post<Organization>('/organizations', data);
    return res.data;
  },

  list: async (): Promise<Organization[]> => {
    const res = await api.get<{ organizations: Organization[] }>('/organizations');
    return res.data.organizations || [];
  },

  getById: async (id: number): Promise<Organization> => {
    const res = await api.get<Organization>(`/organizations/${id}`);
    return res.data;
  },

  update: async (id: number, data: { name?: string; description?: string }): Promise<void> => {
    await api.patch(`/organizations/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/organizations/${id}`);
  },

  addMember: async (orgId: number, data: { email: string; role: string }): Promise<void> => {
    await api.post(`/organizations/${orgId}/members`, data);
  },

  getMembers: async (orgId: number): Promise<OrganizationMember[]> => {
    const res = await api.get<OrganizationMember[]>(`/organizations/${orgId}/members`);
    return res.data;
  },

  updateMemberRole: async (orgId: number, userId: number, role: string): Promise<void> => {
    await api.patch(`/organizations/${orgId}/members/${userId}`, { role });
  },

  removeMember: async (orgId: number, userId: number): Promise<void> => {
    await api.delete(`/organizations/${orgId}/members/${userId}`);
  },
};
