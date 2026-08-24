import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '@/api/auth';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '@/lib/axios';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Decode user info from JWT payload (fallback when /auth/me is unavailable)
function decodeJwtUser(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.user_id ?? payload.sub,
      name: payload.name ?? '',
      email: payload.email ?? '',
      role: payload.role ?? 'user',
      email_verified: payload.email_verified ?? false,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from stored tokens
  useEffect(() => {
    const accessToken = getAccessToken();
    if (accessToken) {
      // Try /auth/me first; fall back to JWT decode
      authApi
        .me()
        .then((profile) => setUser(profile))
        .catch(() => {
          const decoded = decodeJwtUser(accessToken);
          setUser(decoded);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setTokens(data.access_token, data.refresh_token);
    // Load profile
    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch {
      const decoded = decodeJwtUser(data.access_token);
      setUser(decoded);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register({ name, email, password });
    setTokens(data.access_token, data.refresh_token);
    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch {
      const decoded = decodeJwtUser(data.access_token);
      setUser(decoded);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
