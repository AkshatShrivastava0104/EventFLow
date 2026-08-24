import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TicketCard } from '@/components/tickets/TicketCard';
import { ticketsApi } from '@/api/tickets';
import { Ticket as TicketIcon } from 'lucide-react';

export function MyTicketsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'mine'],
    queryFn: () => ticketsApi.mine(),
  });

  const ticket = useQuery({
    queryKey: ['tickets', selected],
    queryFn: () => ticketsApi.get(selected!),
    enabled: !!selected,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">My tickets</h1>
        <p className="mt-1 text-sm text-ink-500">Show your QR code at the door.</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>Issued tickets for your registrations.</CardDescription>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<TicketIcon className="h-5 w-5" />}
            title="No tickets yet"
            description="Tickets will appear here once issued."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {data!.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className="rounded-lg border border-ink-200 bg-white p-4 text-left transition-shadow hover:shadow-pop"
              >
                <p className="line-clamp-1 text-sm font-semibold text-ink-900">{t.event?.title ?? 'Event'}</p>
                <p className="mt-1 text-xs text-ink-500">{t.event?.venue ?? '—'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-700">{t.ticket_number}</span>
                  <span className="text-xs text-ink-500">View QR</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Your ticket"
        footer={<>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </>}
      >
        {ticket.isLoading ? <Skeleton className="h-64" /> : ticket.data ? (
          <TicketCard ticket={ticket.data} />
        ) : <p className="text-sm text-ink-500">Ticket not found.</p>}
      </Modal>
    </div>
  );
}
