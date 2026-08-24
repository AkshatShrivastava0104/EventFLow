import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EventForm } from '@/components/events/EventForm';
import { Card } from '@/components/ui/Card';
import type { EventPayload } from '@/types/event';
import { normalizeError } from '@/api/client';

export function EventCreate() {
  const { activeOrgId } = useOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (payload: EventPayload) => eventsApi.create(activeOrgId!, payload),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['org', activeOrgId, 'events'] });
      toast.success('Event created as a draft');
      navigate(`/org/events/${res.event_id}`);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={
          <Link
            to="/org/events"
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Events
          </Link>
        }
        title="Create event"
        description="New events start as a draft. You can publish them when ready."
      />
      <Card>
        <EventForm
          submitLabel="Create event"
          submitting={mutation.isPending}
          onSubmit={(payload) => mutation.mutate(payload)}
          onCancel={() => navigate('/org/events')}
        />
      </Card>
    </div>
  );
}
