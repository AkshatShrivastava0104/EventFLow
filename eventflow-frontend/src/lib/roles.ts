import type { User } from '@/types/auth';

// The three product tiers. A single account can qualify for more than one:
//  - owner    → platform super-admin (system role "admin")
//  - org      → member of at least one organization (workspace)
//  - attendee → any authenticated user (the default)
export type Tier = 'owner' | 'org' | 'attendee';

export const TIER_HOME: Record<Tier, string> = {
  owner: '/owner',
  org: '/org',
  attendee: '/app',
};

export function isPlatformAdmin(user?: User | null): boolean {
  return user?.role === 'admin';
}
