import { Badge } from '@/components/ui/Badge';
import { EVENT_STATUS_META } from '@/lib/constants';
import type { EventStatus } from '@/types/event';

export function EventStatusBadge({ status }: { status: EventStatus | string }) {
  const meta =
    EVENT_STATUS_META[status as EventStatus] ?? {
      label: status || 'Unknown',
      tone: 'neutral' as const,
    };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
