import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'gray' | 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'yellow';

const tones: Record<Tone, string> = {
  gray: 'bg-ink-100 text-ink-700 border-ink-200',
  green: 'bg-brand-50 text-brand-700 border-brand-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'green' ? 'bg-brand-500' : tone === 'red' ? 'bg-red-500' : tone === 'blue' ? 'bg-sky-500' : tone === 'orange' ? 'bg-orange-500' : tone === 'purple' ? 'bg-violet-500' : tone === 'yellow' ? 'bg-yellow-500' : 'bg-ink-500')} />}
      {children}
    </span>
  );
}
