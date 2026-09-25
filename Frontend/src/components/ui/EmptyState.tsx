import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        {icon || <PackageOpen className="h-7 w-7" />}
      </div>
      <h4 className="font-display text-lg font-semibold text-ink-900">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
