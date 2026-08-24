import QRCode from 'react-qr-code';
import { Calendar, MapPin, Hash, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { fmtDateTime } from '@/lib/format';
import type { Ticket } from '@/types/ticket';

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="print-ticket">
      <Card className="mx-auto max-w-md">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">Event Ticket</p>
            <h3 className="text-lg font-semibold text-ink-900">{ticket.event?.title ?? 'Event'}</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm text-ink-700">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-ink-400" />
            <span>{ticket.attendee?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ink-400" />
            <span>{fmtDateTime(ticket.event?.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ink-400" />
            <span>{ticket.event?.venue ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-ink-400" />
            <span className="font-mono">{ticket.ticket_number}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-center rounded-md bg-white p-4">
          <QRCode value={ticket.qr_payload} size={180} />
        </div>
        <p className="mt-3 text-center text-2xs text-ink-500">
          Show this QR code at the venue entrance.
        </p>
      </Card>
    </div>
  );
}
