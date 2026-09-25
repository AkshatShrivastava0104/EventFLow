import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { RegistrationsAPI, EventsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

export function Attendees() {
  const [q, setQ] = useState('');
  const [eventId, setEventId] = useState('all');
  const { data, isLoading } = useQuery({ queryKey: ['registrations'], queryFn: () => RegistrationsAPI.list() });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => EventsAPI.list() });

  const grouped = useMemo(() => {
    let list = (data || []).filter((r) => r.status === 'confirmed');
    if (eventId !== 'all') list = list.filter((r) => String(r.event_id) === eventId);
    if (q) list = list.filter((r) => (r.user_name + ' ' + r.user_email).toLowerCase().includes(q.toLowerCase()));
    const map: Record<string, { name: string; email: string; regs: number; events: Set<string>; total: number }> = {};
    list.forEach((r) => {
      const key = r.user_email;
      map[key] = map[key] || { name: r.user_name, email: r.user_email, regs: 0, events: new Set(), total: 0 };
      map[key].regs += r.quantity;
      map[key].total += Number(r.total_amount);
      if (r.event) map[key].events.add(r.event.title);
    });
    return Object.values(map).sort((a, b) => b.regs - a.regs);
  }, [data, q, eventId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Attendees</h2>
        <p className="text-sm text-ink-500">Unique people who've registered for your events.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:grid-cols-[1fr_200px]">
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
          <Search className="h-4 w-4 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search attendees" className="h-10 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="all">All events</option>
          {(events || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3">Attendee</th><th>Events attended</th><th>Tickets</th><th>Total spent</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={4} className="p-3"><Skeleton className="h-8" /></td></tr>)
                : grouped.length === 0
                  ? <tr><td colSpan={4} className="p-6"><EmptyState icon={<Users className="h-5 w-5" />} title="No attendees yet" /></td></tr>
                  : grouped.map((a) => (
                    <tr key={a.email} className="hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold text-white uppercase">{a.name.slice(0, 1)}</div>
                          <div>
                            <div className="font-semibold">{a.name}</div>
                            <div className="text-xs text-ink-500">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(a.events).slice(0, 2).map((e) => <Badge key={e} tone="gray">{e}</Badge>)}
                          {a.events.size > 2 && <span className="text-xs text-ink-500">+{a.events.size - 2} more</span>}
                        </div>
                      </td>
                      <td className="font-semibold">{a.regs}</td>
                      <td className="font-semibold">${a.total.toFixed(2)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
