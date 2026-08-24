// Auth contract. Register/login return ONLY tokens — the current user is
// fetched separately via GET /auth/me.

export type SystemRole = 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: SystemRole;
  email_verified: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}
