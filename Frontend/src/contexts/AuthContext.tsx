import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import api, {
  clearTokens,
} from '../lib/api';

export type RoleName = 'user' | 'staff' | 'admin' | 'owner';

export interface AuthUser {
  id: number;
  name?: string;
  email: string;
  role?: string;
  organization_id?: number | null;
}

interface Organization {
  id: number;
  name: string;
  description?: string | null;
  owner_id?: number | null;
  role?: string;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  role: RoleName;
  displayName: string;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  role: 'user',
  displayName: 'Guest',
  signOut: async () => { },
  refreshUser: async () => { },
});

/**
 * Converts backend platform roles into frontend roles.
 */
function normalizePlatformRole(role?: string): RoleName {
  switch (role?.trim().toUpperCase()) {
    case 'PLATFORM_OWNER':
    case 'OWNER':
      return 'owner';

    default:
      return 'user';
  }
}

/**
 * Decode the JWT payload.
 *
 * This is used only to resolve the frontend role.
 * Backend authorization is still enforced by the API.
 */
function getTokenRole(): string | undefined {
  try {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return undefined;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return undefined;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(
          (char) =>
            `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`
        )
        .join('')
    );

    const payload = JSON.parse(jsonPayload) as {
      role?: string;
    };

    return payload.role;
  } catch (error) {
    console.error('Failed to decode access token:', error);
    return undefined;
  }
}

/**
 * Extract organization array from the different response
 * shapes that the backend may return.
 */
function extractOrganizations(data: unknown): Organization[] {
  if (Array.isArray(data)) {
    return data as Organization[];
  }

  if (
    data &&
    typeof data === 'object' &&
    'organizations' in data &&
    Array.isArray(
      (data as { organizations?: unknown }).organizations
    )
  ) {
    return (
      data as { organizations: Organization[] }
    ).organizations;
  }

  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (
      data as { data: Organization[] }
    ).data;
  }

  return [];
}

/**
 * Resolve the frontend organization role.
 *
 * Backend architecture:
 *
 * Platform role:
 *   user
 *   platform_owner
 *
 * Organization membership role:
 *   ADMIN
 *   STAFF
 *
 * Organization role is NOT stored in the JWT.
 */
async function resolveOrganizationRole(): Promise<{
  role: RoleName;
  organizationId: number | null;
}> {
  try {
    const response = await api.get('/organizations');

    const organizations = extractOrganizations(
      response.data
    );

    if (!organizations.length) {
      return {
        role: 'user',
        organizationId: null,
      };
    }

    /*
     * If the user belongs to multiple organizations:
     *
     * ADMIN takes priority over STAFF.
     */
    const adminOrganization = organizations.find(
      (organization) =>
        organization.role?.trim().toUpperCase() === 'ADMIN'
    );

    if (adminOrganization) {
      return {
        role: 'admin',
        organizationId: adminOrganization.id,
      };
    }

    const staffOrganization = organizations.find(
      (organization) =>
        organization.role?.trim().toUpperCase() === 'STAFF'
    );

    if (staffOrganization) {
      return {
        role: 'staff',
        organizationId: staffOrganization.id,
      };
    }

    return {
      role: 'user',
      organizationId: organizations[0].id,
    };
  } catch (error) {
    /*
     * Organization API failure should NOT turn a valid
     * authenticated user into a logged-out user.
     */
    console.error(
      'Failed to resolve organization role:',
      error
    );

    return {
      role: 'user',
      organizationId: null,
    };
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] = useState(true);

  /**
   * Fetch authenticated user and resolve platform/org role.
   */
  const refreshUser = async () => {
    const token =
      localStorage.getItem('access_token');

    if (!token) {
      setUser(null);
      return;
    }

    try {
      /*
       * First get authenticated user from backend.
       */
      const userResponse =
        await api.get<AuthUser>('/auth/me');

      const authenticatedUser =
        userResponse.data;

      /*
       * IMPORTANT:
       *
       * Check BOTH:
       * 1. /auth/me role
       * 2. JWT role
       *
       * This prevents platform_owner from being shown
       * as normal user if /auth/me returns an outdated/
       * normalized role.
       */
      const apiPlatformRole =
        normalizePlatformRole(
          authenticatedUser.role
        );

      const tokenPlatformRole =
        normalizePlatformRole(
          getTokenRole()
        );

      const platformRole =
        apiPlatformRole === 'owner' ||
          tokenPlatformRole === 'owner'
          ? 'owner'
          : 'user';

      /*
       * Platform owner is completely independent from
       * organization membership.
       */
      if (platformRole === 'owner') {
        setUser({
          ...authenticatedUser,
          role: 'owner',
          organization_id:
            authenticatedUser.organization_id ?? null,
        });

        return;
      }

      /*
       * Normal platform user:
       *
       * Resolve ADMIN / STAFF from organization
       * membership.
       */
      const organizationRole =
        await resolveOrganizationRole();

      setUser({
        ...authenticatedUser,
        role: organizationRole.role,
        organization_id:
          organizationRole.organizationId,
      });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        clearTokens();
        setUser(null);
      } else {
        console.error(
          'Failed to load authenticated user:',
          error
        );
      }
    }
  };

  /**
   * Restore authentication when application starts.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Logout current user.
   */
  const signOut = async () => {
    const refreshToken =
      localStorage.getItem('refresh_token');

    try {
      if (refreshToken) {
        await api.post('/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } catch {
      // Clear local session even if logout API fails.
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const role: RoleName =
    user?.role === 'owner' ||
      user?.role === 'admin' ||
      user?.role === 'staff' ||
      user?.role === 'user'
      ? user.role
      : 'user';

  const displayName =
    user?.name?.trim() ||
    (user?.email
      ? user.email.split('@')[0]
      : 'Guest');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        displayName,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);