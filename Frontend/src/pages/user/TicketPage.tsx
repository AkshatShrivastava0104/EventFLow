import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Download, Share2, ArrowLeft, Info } from 'lucide-react';
import { TicketsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QRCode } from '../../components/shared/QRCode';
import { fmtDate, fmtTime } from '../../lib/utils';
import toast from 'react-hot-toast';

export function TicketPage() {
  const { id } = useParams();
  const { data: ticket, isLoading } = useQuery({ queryKey: ['ticket', id], queryFn: () => TicketsAPI.get(id!), enabled: !!id });

  if (isLoading) return <div className="mx-auto max-w-2xl p-10"><Skeleton className="h-96 w-full" /></div>;
  if (!ticket) return <div className="p-10 text-center text-ink-500">Ticket not found.</div>;
  const event = ticket.event!;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/my-registrations" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600"><ArrowLeft className="h-4 w-4" /> All tickets</Link>

      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px]">
          <div className="bg-ink-950 p-6 text-white sm:p-8">
            <div className="flex items-center gap-2">
              <Badge tone={ticket.checked_in ? 'green' : 'blue'} dot>{ticket.checked_in ? 'Checked in' : 'Valid'}</Badge>
              <Badge tone="gray">{event.category}</Badge>
            </div>
            <h1 className="font-display mt-3 text-3xl font-semibold leading-tight">{event.title}</h1>
            <div className="mt-6 grid gap-4 text-sm">
              <TicketRow icon={<Calendar className="h-4 w-4" />} label="When" value={fmtDate(event.start_at)} sub={`${fmtTime(event.start_at)} – ${fmtTime(event.end_at)}`} />
              <TicketRow icon={<MapPin className="h-4 w-4" />} label="Where" value={event.venue} sub={`${event.address}, ${event.city}`} />
            </div>
            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-ink-300">
              <p>ATTENDEE</p>
              <p className="mt-1 font-semibold text-white">{ticket.attendee_name}</p>
              <p>{ticket.attendee_email}</p>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center gap-3 border-t sm:border-l sm:border-t-0 border-dashed border-ink-200 bg-white p-6">
            {/* notch */}
            <div className="absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-ink-50 sm:block" />
            <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-ink-50 sm:block" />
            <QRCode value={ticket.ticket_code} size={180} />
            <p className="font-mono text-sm font-semibold text-ink-900">{ticket.ticket_code}</p>
            <p className="text-xs text-ink-500">Present at entry</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-ink-500"><Info className="h-3.5 w-3.5" /> This ticket is unique. Do not share the QR code publicly.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success('PDF downloaded')}>PDF</Button>
            <Button variant="outline" size="sm" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>Share</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
        {sub && <p className="text-xs text-ink-300">{sub}</p>}
      </div>
    </div>
  );
}
