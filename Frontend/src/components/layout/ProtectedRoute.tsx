import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type AppRole = 'owner' | 'admin' | 'staff' | 'user';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: AppRole[];
}

export function ProtectedRoute({
  children,
  roles,
}: ProtectedRouteProps) {
  const {
    user,
    loading,
    role,
  } = useAuth();

  const location = useLocation();

  /* =========================================================
     Auth loading
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-500">
        Loading…
      </div>
    );
  }

  /* =========================================================
     Not logged in
  ========================================================= */

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
        }}
        replace
      />
    );
  }

  /* =========================================================
     Role protection
  ========================================================= */

  if (
    roles &&
    !roles.includes(role as AppRole)
  ) {
    let redirectTo = '/';

    if (role === 'owner') {
      redirectTo = '/dashboard';
    } else if (role === 'admin') {
      redirectTo = '/admin';
    } else if (role === 'staff') {
      redirectTo = '/staff';
    } else {
      redirectTo = '/';
    }

    return (
      <Navigate
        to={redirectTo}
        replace
      />
    );
  }

  /* =========================================================
     Authorized
  ========================================================= */

  return <>{children}</>;
}