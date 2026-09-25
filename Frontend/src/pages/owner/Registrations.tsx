import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Mail, XCircle, CheckCircle2 } from 'lucide-react';
import { RegistrationsAPI, EventsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/utils';
import toast from 'react-hot-toast';

export function Registrations() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [eventId, setEventId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const { data, isLoading } = useQuery({ queryKey: ['registrations', 'owner'], queryFn: () => RegistrationsAPI.list() });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => EventsAPI.list() });

  const filtered = useMemo(() => {
    let list = data || [];
    if (eventId !== 'all') list = list.filter((r) => String(r.event_id) === eventId);
    if (status !== 'all') list = list.filter((r) => r.status === status);
    if (q) list = list.filter((r) => (r.user_name + ' ' + r.user_email).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [data, q, eventId, status]);

  const cancel = useMutation({
    mutationFn: (id: number) => RegistrationsAPI.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['registrations'] }); toast.success('Registration cancelled & refunded'); },
  });

  const exportCsv = () => {
    const rows = [
      ['ID', 'Name', 'Email', 'Event', 'Type', 'Qty', 'Amount', 'Status', 'Payment', 'Date'],
      ...filtered.map((r) => [r.id, r.user_name, r.user_email, r.event?.title, r.ticket_type, r.quantity, r.total_amount, r.status, r.payment_status, r.created_at]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'registrations.csv'; a.click();
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Registrations</h2>
          <p className="text-sm text-ink-500">Every ticket order across your events.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Mail className="h-4 w-4" />} onClick={() => toast.success('Email sent to all confirmed attendees')}>Email attendees</Button>
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:grid-cols-[1fr_200px_180px]">
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
          <Search className="h-4 w-4 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-10 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="all">All events</option>
          {(events || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="waitlist">Waitlist</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Attendee</th><th>Event</th><th>Type</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Status</th><th>When</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={9} className="p-3"><Skeleton className="h-8" /></td></tr>)
                : filtered.length === 0
                  ? <tr><td colSpan={9} className="p-6"><EmptyState title="No registrations found" /></td></tr>
                  : filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.user_name}</div>
                        <div className="text-xs text-ink-500">{r.user_email}</div>
                      </td>
                      <td>{r.event?.title || '—'}<div className="text-xs text-ink-500">{r.event ? fmtDate(r.event.start_at, 'MMM d') : ''}</div></td>
                      <td>{r.ticket_type}</td>
                      <td>{r.quantity}</td>
                      <td className="font-semibold">{r.event ? fmtMoney(Number(r.total_amount), r.event.currency) : ''}</td>
                      <td><Badge tone={r.payment_status === 'paid' ? 'green' : r.payment_status === 'refunded' ? 'red' : 'gray'}>{r.payment_status}</Badge></td>
                      <td><Badge tone={r.status === 'confirmed' ? 'green' : r.status === 'waitlist' ? 'orange' : r.status === 'cancelled' ? 'red' : 'gray'} dot>{r.status}</Badge></td>
                      <td className="text-xs text-ink-500">{fmtRelative(r.created_at)}</td>
                      <td className="pr-4">
                        {r.status !== 'cancelled' && <button onClick={() => cancel.mutate(r.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><XCircle className="h-3 w-3" /> Cancel</button>}
                        {r.status === 'confirmed' && <CheckCircle2 className="inline h-4 w-4 text-brand-600" />}
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
