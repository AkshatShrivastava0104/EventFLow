import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  ShieldCheck,
  Ticket,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { isPlatformAdmin, type Tier } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface TierDef {
  tier: Tier;
  label: string;
  desc: string;
  to: string;
  icon: LucideIcon;
}

export function RoleSwitcher({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const { user } = useAuth();
  const { hasOrg } = useOrg();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const tiers: TierDef[] = [];
  if (isPlatformAdmin(user)) {
    tiers.push({
      tier: 'owner',
      label: 'Platform Console',
      desc: 'Super-admin',
      to: '/owner',
      icon: ShieldCheck,
    });
  }
  if (hasOrg) {
    tiers.push({
      tier: 'org',
      label: 'Workspace',
      desc: 'Run your events',
      to: '/org',
      icon: Building2,
    });
  }
  tiers.push({
    tier: 'attendee',
    label: 'Attendee',
    desc: 'Discover & attend',
    to: '/app',
    icon: Ticket,
  });

  const current: Tier = location.pathname.startsWith('/owner')
    ? 'owner'
    : location.pathname.startsWith('/org')
      ? 'org'
      : 'attendee';
  const currentDef = tiers.find((t) => t.tier === current) ?? tiers[tiers.length - 1];

  // Nothing to switch and no upgrade path → hide entirely.
  if (tiers.length <= 1 && hasOrg) return null;

  const light = tone === 'light';
  const CurrentIcon = currentDef.icon;

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition',
          light
            ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
            : 'border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
        )}
      >
        <CurrentIcon className="h-4 w-4 opacity-80" />
        <span className="hidden font-medium sm:block">{currentDef.label}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-ink-200 bg-white p-1 shadow-pop">
            <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">
              Switch view
            </p>
            {tiers.map((t) => {
              const Icon = t.icon;
              const active = t.tier === current;
              return (
                <button
                  key={t.tier}
                  onClick={() => go(t.to)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                    active ? 'bg-accent-50' : 'hover:bg-ink-50',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md',
                      active
                        ? 'bg-accent-600 text-white'
                        : 'bg-ink-100 text-ink-600',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-900">
                      {t.label}
                    </span>
                    <span className="block text-xs text-ink-500">{t.desc}</span>
                  </span>
                  {active && <Check className="h-4 w-4 text-accent-600" />}
                </button>
              );
            })}
            {!hasOrg && (
              <>
                <div className="my-1 border-t border-ink-100" />
                <button
                  onClick={() => go('/org/create')}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-ink-50"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-dashed border-ink-300 text-ink-500">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-ink-900">
                    Create an organization
                  </span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
