import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization } from '@/types/organization';

const ACTIVE_ORG_KEY = 'eventflow.activeOrg';

interface OrgState {
  organizations: Organization[];
  isLoading: boolean;
  hasOrg: boolean;
  activeOrg: Organization | null;
  activeOrgId: number | null;
  setActiveOrgId: (id: number) => void;
}

const OrgContext = createContext<OrgState | undefined>(undefined);

/**
 * Tracks which organizations the signed-in user belongs to and which one is
 * "active" in the workspace. Membership drives the Organization tier guard.
 */
export function OrgProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [activeOrgId, setActiveOrgIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(ACTIVE_ORG_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  });

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', 'mine'],
    queryFn: () => organizationsApi.list(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const organizations = useMemo(() => data?.organizations ?? [], [data]);

  // Default the active org to the first membership when unset or stale.
  useEffect(() => {
    if (!organizations.length) return;
    const valid =
      activeOrgId != null && organizations.some((o) => o.id === activeOrgId);
    if (!valid) setActiveOrgIdState(organizations[0].id);
  }, [organizations, activeOrgId]);

  useEffect(() => {
    if (activeOrgId != null) {
      localStorage.setItem(ACTIVE_ORG_KEY, String(activeOrgId));
    }
  }, [activeOrgId]);

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === activeOrgId) ?? null,
    [organizations, activeOrgId],
  );

  const value: OrgState = {
    organizations,
    isLoading: isAuthenticated && isLoading,
    hasOrg: organizations.length > 0,
    activeOrg,
    activeOrgId: activeOrg?.id ?? null,
    setActiveOrgId: setActiveOrgIdState,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
