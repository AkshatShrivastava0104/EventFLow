import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl border border-ink-200 bg-white',
      hover && 'transition-shadow hover:shadow-lg',
      className,
    )}>{children}</div>
  );
}
