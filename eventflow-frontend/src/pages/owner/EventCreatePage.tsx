import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EventForm, type EventFormValues } from '@/components/events/EventForm';
import { eventsApi } from '@/api/event';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';

export function EventCreatePage() {
    const [params] = useSearchParams();
    const presetOrg = params.get('org') ?? '';
    const qc = useQueryClient();
    const toast = useToast();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: (v: EventFormValues) =>
            eventsApi.create(presetOrg, {
                ...v,
                starts_at: new Date(v.starts_at).toISOString(),
                ends_at: new Date(v.ends_at).toISOString(),
                registration_deadline: new Date(v.registration_deadline).toISOString(),
            }),
        onSuccess: (e) => {
            qc.invalidateQueries({ queryKey: ['events'] });
            qc.invalidateQueries({ queryKey: ['organizations'] });
            toast.success('Event created (draft)');
            navigate(`/owner/events/${e.id}`);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    if (!presetOrg) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <Link to="/owner/events" className="text-sm text-ink-500 hover:text-ink-900">← Events</Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">New event</h1>
                </div>
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Pick an organization</CardTitle>
                            <CardDescription>Events must belong to one of your organizations.</CardDescription>
                        </div>
                    </CardHeader>
                    <p className="text-sm text-ink-500">
                        Open one of your organizations and click “New event”, or use the URL with <code className="rounded bg-ink-100 px-1.5 py-0.5">?org=ORG_ID</code>.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <Link to="/owner/events" className="text-sm text-ink-500 hover:text-ink-900">← Events</Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">New event</h1>
            </div>
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>You can edit these before publishing.</CardDescription>
                    </div>
                </CardHeader>
                <EventForm onSubmit={v => mutation.mutate(v)} submitting={mutation.isPending} />
            </Card>
        </div>
    );
}
