import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border border-dashed border-hairline rounded-[var(--radius-lg)] bg-canvas/50", className)}>
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-canvas-elevated border border-hairline mb-4 shadow-whisper">
        <Icon size={24} className="text-mute" />
      </div>
      <h3 className="text-[16px] font-semibold text-ink leading-6 mb-1">{title}</h3>
      {description && <p className="text-[14px] text-body max-w-sm mx-auto mb-6 leading-5">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
