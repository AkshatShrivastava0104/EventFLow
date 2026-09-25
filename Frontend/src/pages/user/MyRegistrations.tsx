import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Calendar, MapPin, Ticket as TicketIcon, XCircle } from 'lucide-react';
import { RegistrationsAPI } from '../../lib/queries';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fmtDate, fmtMoney } from '../../lib/utils';
import toast from 'react-hot-toast';

export function MyRegistrations() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-registrations', user?.id],
    queryFn: () => RegistrationsAPI.list({ user_id: user!.id }),
    enabled: !!user,
  });

  const now = new Date();
  const filtered = (data || []).filter((r) => {
    if (tab === 'cancelled') return r.status === 'cancelled';
    if (!r.event) return tab === 'upcoming';
    const start = new Date(r.event.start_at);
    if (tab === 'upcoming') return start >= now && r.status !== 'cancelled';
    if (tab === 'past') return start < now && r.status !== 'cancelled';
    return true;
  });

  const onCancel = async (id: number) => {
    if (!confirm('Cancel this registration? Any charges will be refunded.')) return;
    await RegistrationsAPI.cancel(id);
    toast.success('Registration cancelled');
    refetch();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">My tickets</p>
      <h1 className="font-display text-4xl font-semibold">My registrations</h1>
      <p className="mt-1 text-ink-500">All the events you've RSVP'd to — in one place.</p>

      <div className="mt-6 flex gap-1 rounded-xl bg-ink-100 p-1 w-fit">
        {(['upcoming', 'past', 'cancelled'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          : filtered.length === 0
            ? <EmptyState icon={<TicketIcon className="h-6 w-6" />} title="Nothing here yet" description="Once you register for an event, it'll show up here." action={<Link to="/events"><Button variant="secondary">Browse events</Button></Link>} />
            : filtered.map((r) => (
              <div key={r.id} className="flex flex-col items-start gap-4 rounded-2xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="aspect-video w-full max-w-[140px] shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === 'cancelled' ? 'red' : r.status === 'waitlist' ? 'orange' : 'green'} dot>{r.status}</Badge>
                    <Badge tone="gray">{r.payment_status}</Badge>
                  </div>
                  <h3 className="font-display mt-1 text-lg font-semibold text-ink-900">{r.event?.title || 'Event'}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {r.event ? fmtDate(r.event.start_at) : ''}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.event?.venue}, {r.event?.city}</span>
                    <span className="inline-flex items-center gap-1"><TicketIcon className="h-3.5 w-3.5" /> {r.ticket_type} × {r.quantity}</span>
                    <span>{r.event ? fmtMoney(Number(r.total_amount), r.event.currency) : ''}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/registrations/${r.id}/success`}><Button variant="outline" size="sm">View</Button></Link>
                  {r.status !== 'cancelled' && r.event && new Date(r.event.start_at) > now && (
                    <Button variant="ghost" size="sm" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => onCancel(r.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
