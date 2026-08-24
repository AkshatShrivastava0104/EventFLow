import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { registrationsApi } from '@/api/registrations';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';
import { REGISTRATION_STATUS } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { Registration } from '@/types/registration';

export function MyRegistrationsPage() {
  const [confirm, setConfirm] = useState<Registration | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const list = useQuery({
    queryKey: ['registrations', 'me', 'all'],
    queryFn: () => registrationsApi.mine({ page_size: 100 }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => registrationsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Registration cancelled.');
      setConfirm(null);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">My registrations</h1>
        <p className="mt-1 text-sm text-ink-500">Events you’ve registered for or joined the waitlist.</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All registrations</CardTitle>
            <CardDescription>Click an event to view details or cancel.</CardDescription>
          </div>
        </CardHeader>

        {list.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (list.data?.data?.length ?? 0) === 0 ? (
          <EmptyState title="No registrations yet" action={<Link to="/app/events"><Button>Browse events</Button></Link>} />
        ) : (
          <div className="divide-y divide-ink-100">
            {list.data!.data.map(r => {
              const meta = REGISTRATION_STATUS[r.status];
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link to={`/app/events/${r.event_id}`} className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{r.event?.title ?? r.event_id}</p>
                    <p className="text-xs text-ink-500">{fmtDateTime(r.event?.starts_at)} · {r.event?.venue}</p>
                  </Link>
                  <div className="flex items-center gap-2">
                    {r.status === 'waitlisted' && r.waitlist_position != null && (
                      <span className="text-2xs text-ink-500">#{r.waitlist_position}</span>
                    )}
                    <Badge tone={meta?.tone as any ?? 'neutral'}>{meta?.label ?? r.status}</Badge>
                    {r.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => setConfirm(r)}>Cancel</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title="Cancel registration?"
        description="Your seat will be released to the next attendee on the waitlist."
        loading={cancel.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && cancel.mutate(confirm.id)}
      />
    </div>
  );
}
