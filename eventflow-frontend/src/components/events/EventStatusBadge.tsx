import { Badge } from '@/components/ui/Badge';
import { EVENT_STATUS } from '@/lib/constants';
import type { EventStatus } from '@/types/event';

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const meta = EVENT_STATUS[status] ?? EVENT_STATUS.draft;
  const tone = meta.tone === 'info' ? 'accent'
    : meta.tone === 'neutral' ? 'neutral' : meta.tone;
  return <Badge tone={tone as any}>{meta.label}</Badge>;
}
