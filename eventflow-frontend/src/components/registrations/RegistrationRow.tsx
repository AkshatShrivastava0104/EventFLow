import { Badge } from '@/components/ui/Badge';
import { REGISTRATION_STATUS } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { Registration } from '@/types/registration';

export function RegistrationRow({ registration }: { registration: Registration }) {
  const meta = REGISTRATION_STATUS[registration.status] ?? REGISTRATION_STATUS.registered;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900">
          {registration.user?.name ?? registration.user_id}
        </p>
        <p className="truncate text-xs text-ink-500">{registration.user?.email}</p>
        <p className="mt-1 text-2xs text-ink-400">{fmtDateTime(registration.created_at)}</p>
      </div>
      <div className="flex items-center gap-2">
        {registration.status === 'waitlisted' && registration.waitlist_position != null && (
          <span className="text-2xs text-ink-500">#{registration.waitlist_position} in queue</span>
        )}
        <Badge tone={meta.tone as any}>{meta.label}</Badge>
      </div>
    </div>
  );
}
