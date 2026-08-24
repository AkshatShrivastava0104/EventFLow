import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket as TicketIcon } from 'lucide-react';
import { ticketsApi } from '@/api/tickets';
import { PageHeader } from '@/components/common/PageHeader';
import { TicketCard } from '@/components/tickets/TicketCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { normalizeError } from '@/api/client';

export function MyTickets() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', 'mine'],
    queryFn: () => ticketsApi.mine(),
  });

  const tickets = data?.tickets ?? [];

  return (
    <div>
      <PageHeader
        title="My tickets"
        description="Show the QR code at the entrance to check in."
      />

      {error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<TicketIcon className="h-5 w-5" />}
          title="No tickets yet"
          description="Register for an event and generate a ticket to see it here."
          action={
            <Link to="/app">
              <Button size="sm">Discover events</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
