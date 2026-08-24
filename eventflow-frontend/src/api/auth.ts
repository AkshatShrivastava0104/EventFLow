import { get, post, tokenStore } from './client';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types/auth';

export const authApi = {
  login: (payload: LoginPayload) => post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    post<AuthResponse>('/auth/register', payload),

  refresh: (refresh_token: string) =>
    post<AuthResponse>('/auth/refresh', { refresh_token }),

  // The backend requires the refresh token in the logout body.
  logout: () => {
    const refresh_token = tokenStore.get()?.refresh_token;
    return post<{ message: string }>('/auth/logout', { refresh_token });
  },

  me: () => get<User>('/auth/me'),
};
