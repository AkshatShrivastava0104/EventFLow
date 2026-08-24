import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EventForm, type EventFormValues } from '@/components/events/EventForm';
import { eventsApi } from '@/api/event';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';

export function EventEditPage() {
    const { eventId = '' } = useParams();
    const qc = useQueryClient();
    const toast = useToast();
    const navigate = useNavigate();

    const { data: event, isLoading } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const mutation = useMutation({
        mutationFn: (v: EventFormValues) =>
            eventsApi.update(eventId, {
                ...v,
                starts_at: new Date(v.starts_at).toISOString(),
                ends_at: new Date(v.ends_at).toISOString(),
                registration_deadline: new Date(v.registration_deadline).toISOString(),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['events'] });
            qc.invalidateQueries({ queryKey: ['events', eventId] });
            toast.success('Event updated');
            navigate(`/owner/events/${eventId}`);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <Link to={`/owner/events/${eventId}`} className="text-sm text-ink-500 hover:text-ink-900">← Back</Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">Edit event</h1>
            </div>
            <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                {isLoading ? (
                    <Skeleton className="h-64" />
                ) : (
                    <EventForm
                        defaultValues={{
                            title: event?.title ?? '',
                            description: event?.description ?? '',
                            venue: event?.venue ?? '',
                            capacity: event?.capacity ?? 50,
                            registration_deadline: event?.registration_deadline,
                            starts_at: event?.starts_at,
                            ends_at: event?.ends_at,
                        }}
                        onSubmit={v => mutation.mutate(v)}
                        submitting={mutation.isPending}
                        submitLabel="Save changes"
                    />
                )}
            </Card>
        </div>
    );
}
