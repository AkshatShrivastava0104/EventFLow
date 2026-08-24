import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

export function Card({ elevated = false, padding = 'lg', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-elevated border border-hairline rounded-[var(--radius-md)]',
        elevated && 'shadow-[0px_2px_2px_rgba(0,0,0,0.05),_0px_8px_16px_-4px_rgba(0,0,0,0.08)]',
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-[20px] font-semibold text-ink leading-7 tracking-[-0.4px]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-hairline my-4', className)} />;
}
