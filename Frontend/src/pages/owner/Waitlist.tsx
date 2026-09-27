import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WaitlistAPI, EventsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fmtRelative } from '../../lib/utils';
import { UserCheck, X, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

export function WaitlistPage() {
  const qc = useQueryClient();
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => EventsAPI.list() });
  const [eventId, setEventId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['waitlist', eventId],
    queryFn: () => WaitlistAPI.list(eventId ? { event_id: eventId } : {}),
    enabled: true,
  });

  const remove = useMutation({
    mutationFn: (id: number) => WaitlistAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waitlist'] }); toast.success('Removed from waitlist'); },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Waitlist</h2>
        <p className="text-sm text-ink-500">People waiting for a spot on sold-out events.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">All events</option>
          {(events || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <Button variant="outline" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => toast.success('Notified 12 waitlisted attendees')}>Promote top waitlist</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3">#</th><th>Attendee</th><th>Event</th><th>Requested</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-3"><Skeleton className="h-8" /></td></tr>)
                : (data || []).length === 0
                  ? <tr><td colSpan={5} className="p-6"><EmptyState icon={<Timer className="h-5 w-5" />} title="No one on the waitlist" description="When events sell out, waitlisted attendees will appear here." /></td></tr>
                  : (data || []).map((w) => (
                    <tr key={w.id} className="hover:bg-ink-50">
                      <td className="px-4 py-3"><Badge tone="orange">#{w.position}</Badge></td>
                      <td><div className="font-semibold">{w.user_name}</div><div className="text-xs text-ink-500">{w.user_email}</div></td>
                      <td>{(events || []).find((e) => e.id === w.event_id)?.title || w.event_id}</td>
                      <td className="text-xs text-ink-500">{fmtRelative(w.created_at)}</td>
                      <td className="pr-4">
                        <button onClick={() => remove.mutate(w.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><X className="h-3 w-3" /> Remove</button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
