import QRCode from 'react-qr-code';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { fmtDateTime } from '@/lib/format';
import type { MyTicket } from '@/types/ticket';

export function TicketCard({ ticket }: { ticket: MyTicket }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-soft">
      <div className="flex flex-col sm:flex-row">
        {/* Details */}
        <div className="flex-1 p-5">
          <div className="mb-2 flex items-center gap-2">
            <EventStatusBadge status={ticket.event_status} />
            {ticket.checked_in && (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> Checked in
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-ink-900">{ticket.event_title}</h3>

          <div className="mt-3 flex flex-col gap-1.5 text-sm text-ink-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
              {fmtDateTime(ticket.event_start)}
            </span>
            {ticket.event_venue && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
                <span className="truncate">{ticket.event_venue}</span>
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-dashed border-ink-200 pt-3">
            <p className="text-2xs uppercase tracking-wide text-ink-400">Ticket number</p>
            <p className="font-mono text-sm font-medium text-ink-900">
              {ticket.ticket_number}
            </p>
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-center gap-2 border-t border-ink-100 bg-ink-50 p-5 sm:border-l sm:border-t-0">
          <div className="rounded-lg bg-white p-3 shadow-soft">
            <QRCode
              value={ticket.qr_code || ticket.ticket_number}
              size={112}
              style={{ height: 112, width: 112 }}
            />
          </div>
          <p className="text-2xs text-ink-400">Show at entry</p>
        </div>
      </div>
    </div>
  );
}
