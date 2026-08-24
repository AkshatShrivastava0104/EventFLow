import { cn } from '@/lib/utils';
import type { EventStatus } from '@/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'mute' | 'violet' | 'cyan';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-ink text-white',
  success: 'bg-link-soft text-link-deep',
  warning: 'bg-warning-soft text-warning-deep',
  error: 'bg-[#ffeeee] text-error-deep',
  mute: 'bg-hairline-soft text-mute',
  violet: 'bg-violet-soft text-violet',
  cyan: 'bg-cyan-soft text-[#1a7a6b]',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium leading-4 whitespace-nowrap',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Event status badge
export function EventStatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'mute' },
    published: { label: 'Published', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    completed: { label: 'Completed', variant: 'default' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'mute' };
  return <Badge variant={variant}>{label}</Badge>;
}

// Registration status badge
export function RegistrationBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge variant="success">Registered</Badge>;
  if (status === 'cancelled') return <Badge variant="error">Cancelled</Badge>;
  return <Badge variant="mute">{status}</Badge>;
}

// Notification status dot
export function UnreadDot() {
  return <span className="inline-block w-2 h-2 rounded-full bg-link flex-shrink-0" />;
}
