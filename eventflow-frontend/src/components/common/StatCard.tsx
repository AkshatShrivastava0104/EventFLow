import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  /** Accent colour for the icon chip. */
  tone?: 'ink' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const toneClass: Record<NonNullable<Props['tone']>, string> = {
  ink: 'bg-ink-100 text-ink-700',
  accent: 'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
};

export function StatCard({ label, value, icon, hint, tone = 'ink', className }: Props) {
  return (
    <Card className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      </div>
      {icon && (
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            toneClass[tone],
          )}
        >
          {icon}
        </span>
      )}
    </Card>
  );
}
