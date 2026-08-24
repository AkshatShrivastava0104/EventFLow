import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EventForm } from '@/components/events/EventForm';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import type { EventPayload } from '@/types/event';
import { normalizeError } from '@/api/client';

export function EventEdit() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { activeOrgId } = useOrg();

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const mutation = useMutation({
    mutationFn: (payload: EventPayload) => eventsApi.update(id, payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['event', id] }),
        qc.invalidateQueries({ queryKey: ['org', activeOrgId, 'events'] }),
      ]);
      toast.success('Event updated');
      navigate(`/org/events/${id}`);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={
          <Link
            to={`/org/events/${id}`}
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to event
          </Link>
        }
        title="Edit event"
      />

      {error ? (
        <Alert tone="danger">{normalizeError(error).message}</Alert>
      ) : isLoading || !data ? (
        <Card>
          <Skeleton className="h-72" />
        </Card>
      ) : (
        <Card>
          <EventForm
            defaultValues={data}
            submitLabel="Save changes"
            submitting={mutation.isPending}
            onSubmit={(payload) => mutation.mutate(payload)}
            onCancel={() => navigate(`/org/events/${id}`)}
          />
        </Card>
      )}
    </div>
  );
}
