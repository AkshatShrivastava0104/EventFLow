import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ScanLine } from 'lucide-react';
import { EventsAPI, TicketsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export function TicketsAdmin() {
  const qc = useQueryClient();
  const [eventId, setEventId] = useState('');
  const [q, setQ] = useState('');
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => EventsAPI.list() });
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'admin', eventId],
    queryFn: () => TicketsAPI.list(eventId ? { event_id: eventId } : {}),
    enabled: !!eventId,
  });

  const filtered = (data || []).filter((t) => !q || (t.ticket_code + t.attendee_name + t.attendee_email).toLowerCase().includes(q.toLowerCase()));

  const checkin = useMutation({
    mutationFn: (code: string) => TicketsAPI.checkin(code),
    onSuccess: (t: any) => { qc.invalidateQueries({ queryKey: ['tickets'] }); toast.success(t.already ? 'Already checked in' : 'Checked in!'); },
    onError: () => toast.error('Ticket not found'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Tickets & check-in</h2>
          <p className="text-sm text-ink-500">View all tickets and mark attendees as checked in.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:grid-cols-[240px_1fr]">
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Pick an event…</option>
          {(events || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
          <Search className="h-4 w-4 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ticket code or attendee" className="h-10 flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3">Code</th><th>Attendee</th><th>Email</th><th>Status</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {!eventId ? <tr><td colSpan={5} className="p-6"><EmptyState icon={<ScanLine className="h-5 w-5" />} title="Pick an event" description="Choose an event above to load its tickets." /></td></tr>
                : isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-3"><Skeleton className="h-8" /></td></tr>)
                : filtered.length === 0 ? <tr><td colSpan={5} className="p-6"><EmptyState title="No tickets" description="No tickets have been issued yet." /></td></tr>
                : filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-mono text-xs">{t.ticket_code}</td>
                    <td>{t.attendee_name}</td>
                    <td className="text-xs text-ink-500">{t.attendee_email}</td>
                    <td><Badge tone={t.checked_in ? 'green' : 'gray'} dot>{t.checked_in ? 'Checked in' : 'Awaiting'}</Badge></td>
                    <td className="pr-4">
                      {!t.checked_in && <Button variant="outline" size="sm" leftIcon={<ScanLine className="h-3.5 w-3.5" />} onClick={() => checkin.mutate(t.ticket_code)}>Check in</Button>}
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
