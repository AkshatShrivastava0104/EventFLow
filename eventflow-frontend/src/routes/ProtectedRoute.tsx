import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { isPlatformAdmin } from '@/lib/roles';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';

/**
 * Best landing route for the signed-in user:
 *  admin → owner console, org member → workspace, otherwise → attendee app.
 */
export function useHomePath(): string {
  const { user } = useAuth();
  const { hasOrg } = useOrg();
  if (isPlatformAdmin(user)) return '/owner';
  if (hasOrg) return '/org';
  return '/app';
}

/** Any authenticated user. */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Platform super-admin only (system role "admin"). */
export function RequireAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isPlatformAdmin(user)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

/** Members of at least one organization; otherwise sent to create one. */
export function RequireOrg() {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasOrg, isLoading: orgLoading } = useOrg();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (orgLoading) return <FullPageSpinner />;
  if (!hasOrg) return <Navigate to="/org/create" replace />;
  return <Outlet />;
}

/** Login / register — redirect away if already signed in. */
export function PublicOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: orgLoading } = useOrg();
  const home = useHomePath();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) {
    if (orgLoading) return <FullPageSpinner />;
    const from = (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname;
    return <Navigate to={from || home} replace />;
  }
  return <Outlet />;
}
