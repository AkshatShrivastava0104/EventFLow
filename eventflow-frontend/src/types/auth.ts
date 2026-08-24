export type UserRole = 'owner' | 'admin' | 'staff' | 'attendee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  organization_name?: string;
}
