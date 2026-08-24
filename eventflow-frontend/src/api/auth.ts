import { get, post } from './client';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth';

export const authApi = {
  login: (payload: LoginPayload) =>
    post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) =>
    post<AuthResponse>('/auth/register', payload),
  refresh: (refresh_token: string) =>
    post<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token },
    ),
  logout: () => post<void>('/auth/logout'),
  me: () => get<User>('/auth/me'),
};
