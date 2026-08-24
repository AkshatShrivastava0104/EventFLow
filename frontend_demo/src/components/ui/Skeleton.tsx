import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-hairline-soft', className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("hairline-card p-6 flex flex-col gap-4", className)}>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-8 w-24 rounded-[var(--radius-pill)]" />
      </div>
    </div>
  );
}
