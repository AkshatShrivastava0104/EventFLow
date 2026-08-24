import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { tokenStore } from '@/api/client';
import type { LoginPayload, RegisterPayload, User } from '@/types/auth';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [hasToken, setHasToken] = useState<boolean>(!!tokenStore.get()?.access_token);
    const queryClient = useQueryClient();

    useEffect(() => {
        const onLogout = () => {
            setHasToken(false);
            queryClient.clear();
        };
        const onTokens = () => setHasToken(!!tokenStore.get()?.access_token);

        window.addEventListener('auth:logout', onLogout);
        window.addEventListener('auth:tokens-updated', onTokens);
        return () => {
            window.removeEventListener('auth:logout', onLogout);
            window.removeEventListener('auth:tokens-updated', onTokens);
        };
    }, [queryClient]);

    const { data: user, isLoading } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: () => authApi.me(),
        enabled: hasToken,
        staleTime: 5 * 60_000,
        retry: false,
    });

    const login = async (payload: LoginPayload) => {
        const res = await authApi.login(payload);
        tokenStore.set({ access_token: res.access_token, refresh_token: res.refresh_token });
    };

    const register = async (payload: RegisterPayload) => {
        const res = await authApi.register(payload);
        tokenStore.set({ access_token: res.access_token, refresh_token: res.refresh_token });
    };

    const logout = async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        tokenStore.clear();
        queryClient.clear();
    };

    const refreshUser = async () => {
        await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    };

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isAuthenticated: hasToken && !!user,
                isLoading: hasToken && isLoading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


// ... existing AuthProvider code ...

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
