import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function StatCard({ label, value, delta, icon, tone = 'default', dark }: {
  label: string; value: ReactNode; delta?: string; icon?: ReactNode;
  tone?: 'default' | 'positive' | 'negative'; dark?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-5',
      dark ? 'border-white/10 bg-white/5' : 'border-ink-200 bg-white',
    )}>
      <div className="flex items-center justify-between">
        <p className={cn('text-xs font-semibold uppercase tracking-wider', dark ? 'text-ink-300' : 'text-ink-500')}>{label}</p>
        {icon && <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', dark ? 'bg-white/10 text-brand-300' : 'bg-brand-50 text-brand-600')}>{icon}</div>}
      </div>
      <div className={cn('mt-2 font-display text-3xl font-semibold', dark ? 'text-white' : 'text-ink-900')}>{value}</div>
      {delta && (
        <p className={cn('mt-1 text-xs font-medium', tone === 'positive' ? 'text-brand-600' : tone === 'negative' ? 'text-red-600' : dark ? 'text-ink-300' : 'text-ink-500')}>{delta}</p>
      )}
    </div>
  );
}
