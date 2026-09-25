import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Ticket, ArrowRight, Download, Share2 } from 'lucide-react';
import { RegistrationsAPI, TicketsAPI } from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import { fmtDate, fmtMoney } from '../../lib/utils';
import { QRCode } from '../../components/shared/QRCode';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export function RegistrationSuccess() {
  const { id } = useParams();
  const { data: reg } = useQuery({ queryKey: ['registration', id], queryFn: () => RegistrationsAPI.get(Number(id)), enabled: !!id });
  const { data: tickets } = useQuery({ queryKey: ['tickets', 'reg', id], queryFn: () => TicketsAPI.list({ registration_id: id }), enabled: !!id });

  useEffect(() => { toast.success('Registration confirmed!'); }, []);

  if (!reg) return <div className="p-10 text-center text-ink-500">Loading confirmation…</div>;
  const event = reg.event!;
  const isWaitlist = reg.status === 'waitlist';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 18 }} className="flex flex-col items-center text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isWaitlist ? 'bg-orange-100 text-orange-600' : 'bg-brand-100 text-brand-600'}`}>
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-display mt-4 text-4xl font-semibold">{isWaitlist ? "You're on the waitlist" : "You're going!"}</h1>
        <p className="mt-2 max-w-lg text-ink-600">
          {isWaitlist
            ? `We'll email ${reg.user_email} the moment a spot opens up for ${event.title}.`
            : `We've emailed your ${reg.quantity} ticket${reg.quantity > 1 ? 's' : ''} to ${reg.user_email}.`}
        </p>
      </motion.div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-ink-200 bg-white">
        <div className="bg-ink-950 p-6 text-white">
          <p className="text-xs uppercase tracking-widest text-ink-300">Confirmation</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">{event.title}</h2>
          <p className="mt-1 text-sm text-ink-300">{fmtDate(event.start_at)} • {event.venue}, {event.city}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <Row label="Attendee" value={reg.user_name} />
            <Row label="Email" value={reg.user_email} />
            <Row label="Ticket type" value={`${reg.ticket_type} × ${reg.quantity}`} />
            <Row label="Total paid" value={reg.payment_status === 'free' ? 'Free' : fmtMoney(Number(reg.total_amount), event.currency)} />
            <Row label="Payment" value={reg.payment_status === 'paid' ? `✓ ${reg.payment_id}` : reg.payment_status} />
          </div>
          {!isWaitlist && tickets && tickets[0] && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-ink-50 p-4">
              <QRCode value={tickets[0].ticket_code} size={140} />
              <p className="mt-2 font-mono text-xs text-ink-600">{tickets[0].ticket_code}</p>
              <p className="text-xs text-ink-500">Show this at the door</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50 p-4">
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success('Ticket PDF downloaded')}>Download PDF</Button>
            <Button variant="outline" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>Share</Button>
          </div>
          <Link to="/my-registrations"><Button variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>View my registrations</Button></Link>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 text-sm text-ink-500">
        <Link to="/events" className="hover:text-ink-900">Browse more events</Link>
        <span>•</span>
        {tickets && tickets[0] && <Link to={`/tickets/${tickets[0].id}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Ticket className="h-3.5 w-3.5" /> Open ticket page</Link>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-900 text-right">{value}</span></div>;
}
