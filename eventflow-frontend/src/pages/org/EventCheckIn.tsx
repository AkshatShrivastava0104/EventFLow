import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, QrCode, XCircle } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { checkinApi } from '@/api/checkin';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { normalizeError } from '@/api/client';

interface LogEntry {
  key: number;
  ticket: string;
  ok: boolean;
  message: string;
}

export function EventCheckIn() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ticket, setTicket] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const seq = useRef(0);

  const eventQ = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const mutation = useMutation({
    mutationFn: (ticketNumber: string) => checkinApi.checkIn(id, ticketNumber),
    onSuccess: (res, ticketNumber) => {
      seq.current += 1;
      setLog((l) => [
        { key: seq.current, ticket: ticketNumber, ok: true, message: res.message || 'Checked in' },
        ...l,
      ]);
      setTicket('');
      inputRef.current?.focus();
    },
    onError: (e, ticketNumber) => {
      seq.current += 1;
      setLog((l) => [
        { key: seq.current, ticket: ticketNumber, ok: false, message: normalizeError(e).message },
        ...l,
      ]);
      inputRef.current?.select();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticket.trim();
    if (t) mutation.mutate(t);
  };

  const okCount = log.filter((l) => l.ok).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={
          <Link
            to={`/org/events/${id}`}
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to event
          </Link>
        }
        title="Check-in"
        description={eventQ.data?.title}
        actions={eventQ.data ? <EventStatusBadge status={eventQ.data.status} /> : undefined}
      />

      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Ticket number
            </label>
            <div className="relative">
              <QrCode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                ref={inputRef}
                autoFocus
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="Scan or type the ticket number"
                className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 font-mono text-sm text-ink-900 placeholder:font-sans placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
              />
            </div>
          </div>
          <Button type="submit" size="lg" loading={mutation.isPending} disabled={!ticket.trim()}>
            Check in
          </Button>
        </form>
      </Card>

      <Card className="mt-6" padded={false}>
        <CardHeader className="p-5 pb-0">
          <CardTitle>Session activity</CardTitle>
          {okCount > 0 && (
            <span className="text-sm text-ink-500">
              {okCount} checked in this session
            </span>
          )}
        </CardHeader>
        <div className="p-5">
          {log.length === 0 ? (
            <EmptyState
              icon={<QrCode className="h-5 w-5" />}
              title="No scans yet"
              description="Checked-in tickets will appear here as you scan them."
            />
          ) : (
            <ul className="space-y-2">
              {log.map((entry) => (
                <li
                  key={entry.key}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3',
                    entry.ok ? 'border-success-500/30 bg-success-50' : 'border-danger-500/30 bg-danger-50',
                  )}
                >
                  {entry.ok ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-danger-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-ink-900">{entry.ticket}</p>
                    <p className={cn('text-xs', entry.ok ? 'text-success-700' : 'text-danger-700')}>
                      {entry.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
