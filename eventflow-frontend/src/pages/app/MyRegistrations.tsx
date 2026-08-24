import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { CalendarSearch, Ticket as TicketIcon } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { registrationsApi } from '@/api/registrations';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fmtDate } from '@/lib/format';
import { registrationStatusMeta, paymentStatusMeta, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { Registration } from '@/types/registration';
import { normalizeError } from '@/api/client';

function EventName({ eventId }: { eventId: number }) {
  const { data } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
    staleTime: 60_000,
  });
  return (
    <Link
      to={`/app/events/${eventId}`}
      className="font-medium text-ink-900 hover:text-accent-700"
    >
      {data?.title ?? `Event #${eventId}`}
    </Link>
  );
}

export function MyRegistrations() {
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<Registration | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['registrations', 'mine', page],
    queryFn: () => registrationsApi.mine({ page, limit: DEFAULT_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const cancel = useMutation({
    mutationFn: (registrationId: number) => registrationsApi.cancel(registrationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['registrations', 'mine'] });
      toast.success('Registration cancelled');
      setCancelling(null);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const registrations = data?.registrations ?? [];

  return (
    <div>
      <PageHeader
        title="My registrations"
        description="Events you've signed up for."
      />

      {error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={<CalendarSearch className="h-5 w-5" />}
          title="No registrations yet"
          description="Browse events and register to see them here."
          action={
            <Link to="/app">
              <Button size="sm">Discover events</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Status</TH>
                <TH>Payment</TH>
                <TH>Registered</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {registrations.map((r) => {
                const s = registrationStatusMeta(r.status);
                const p = paymentStatusMeta(r.payment_status);
                const active = r.status.toLowerCase() !== 'cancelled';
                return (
                  <TR key={r.id}>
                    <TD>
                      <EventName eventId={r.event_id} />
                    </TD>
                    <TD>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={p.tone}>{p.label}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-ink-500">{fmtDate(r.created_at)}</TD>
                    <TD className="text-right">
                      {active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-600 hover:bg-danger-50"
                          onClick={() => setCancelling(r)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {data && (
            <Pagination
              className="mt-4"
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onChange={setPage}
            />
          )}
        </>
      )}

      <Alert tone="info" className="mt-6">
        <span className="inline-flex items-center gap-1.5">
          <TicketIcon className="h-4 w-4" /> Generate a ticket from an event page to get your QR code.
        </span>
      </Alert>

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel this registration?"
        description="You may lose your spot if the event is full."
        confirmText="Cancel registration"
        tone="danger"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id)}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
