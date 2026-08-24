import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: Props) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-white p-10 text-center',
      className,
    )}>
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-ink-500">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
