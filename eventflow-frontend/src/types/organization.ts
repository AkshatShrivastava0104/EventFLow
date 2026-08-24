// Organizations + membership. Member roles are UPPERCASE on the wire.

export interface Organization {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VOLUNTEER';

/** Roles assignable when adding/updating a member (OWNER is implicit). */
export type AssignableRole = Exclude<MemberRole, 'OWNER'>;

export interface OrganizationMember {
  user_id: number;
  name: string;
  email: string;
  role: MemberRole;
  joined_at: string;
}

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
}

export interface UpdateOrganizationPayload {
  name: string;
  description?: string;
}

export interface AddMemberPayload {
  user_id: number;
  role: AssignableRole;
}

export interface UpdateMemberPayload {
  role: AssignableRole;
}
