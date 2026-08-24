import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneClass: Record<Tone, string> = {
  info: 'bg-accent-50 text-accent-700 border-accent-500/20',
  success: 'bg-success-50 text-success-700 border-success-500/20',
  warning: 'bg-warning-50 text-warning-700 border-warning-500/20',
  danger: 'bg-danger-50 text-danger-700 border-danger-500/20',
};

export function Alert({ tone = 'info', title, children, className }: {
  tone?: Tone; title?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', toneClass[tone], className)}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
