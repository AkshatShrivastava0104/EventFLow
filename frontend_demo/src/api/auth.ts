import api from '@/lib/axios';
import type { AuthResponse, User } from '@/types';

export const authApi = {
  register: async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  refresh: async (refresh_token: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/refresh', { refresh_token });
    return res.data;
  },

  logout: async (refresh_token: string): Promise<void> => {
    await api.post('/auth/logout', { refresh_token });
  },

  me: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};
