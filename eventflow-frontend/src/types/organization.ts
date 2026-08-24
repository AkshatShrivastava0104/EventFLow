export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  owner_id: string;
  created_at: string;
  updated_at?: string;
}

export type OrganizationMemberRole = 'owner' | 'admin' | 'staff';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  email: string;
  role: OrganizationMemberRole;
  created_at: string;
}
