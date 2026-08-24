import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, MapPin, Users, Pencil, Trash2, Send, XCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { eventsApi } from '@/api/event';
import { registrationsApi } from '@/api/registrations';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState } from 'react';
import { normalizeError } from '@/api/client';
import { fmtDateTime } from '@/lib/format';
import { RegistrationRow } from '@/components/registrations/RegistrationRow';

export function EventDetailPage() {
    const { eventId = '' } = useParams();
    const qc = useQueryClient();
    const toast = useToast();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const { data: event, isLoading } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });
    const registrations = useQuery({
        queryKey: ['events', eventId, 'registrations'],
        queryFn: () => registrationsApi.forEvent(eventId, { page_size: 50 }),
        enabled: !!eventId,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['events', eventId] });
        qc.invalidateQueries({ queryKey: ['events'] });
        qc.invalidateQueries({ queryKey: ['events', eventId, 'registrations'] });
        qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    const publish = useMutation({
        mutationFn: () => eventsApi.publish(eventId),
        onSuccess: () => { invalidate(); toast.success('Event published'); },
        onError: (e) => toast.error(normalizeError(e).message),
    });
    const cancel = useMutation({
        mutationFn: () => eventsApi.cancel(eventId),
        onSuccess: () => { invalidate(); toast.success('Event cancelled'); setConfirmCancel(false); },
        onError: (e) => toast.error(normalizeError(e).message),
    });
    const complete = useMutation({
        mutationFn: () => eventsApi.complete(eventId),
        onSuccess: () => { invalidate(); toast.success('Event marked as completed'); },
        onError: (e) => toast.error(normalizeError(e).message),
    });
    const remove = useMutation({
        mutationFn: () => eventsApi.remove(eventId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['events'] });
            toast.success('Event deleted');
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    if (isLoading) return <Skeleton className="h-72" />;
    if (!event) return <p className="text-sm text-ink-500">Event not found.</p>;

    const canEdit = event.status === 'draft';
    const canPublish = event.status === 'draft';
    const canCancel = event.status === 'published';
    const canComplete = event.status === 'published';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Link to="/owner/events" className="text-sm text-ink-500 hover:text-ink-900">← Events</Link>
                    <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink-900">
                        {event.title}
                        <EventStatusBadge status={event.status} />
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                        <Link to={`/owner/events/${eventId}/edit`}>
                            <Button variant="outline" icon={<Pencil className="h-4 w-4" />}>Edit</Button>
                        </Link>
                    )}
                    {canPublish && (
                        <Button onClick={() => publish.mutate()} loading={publish.isPending} icon={<Send className="h-4 w-4" />}>
                            Publish
                        </Button>
                    )}
                    {canCancel && (
                        <Button variant="outline" onClick={() => setConfirmCancel(true)} icon={<XCircle className="h-4 w-4" />}>
                            Cancel event
                        </Button>
                    )}
                    {canComplete && (
                        <Button onClick={() => complete.mutate()} loading={complete.isPending} icon={<CheckCircle2 className="h-4 w-4" />}>
                            Mark completed
                        </Button>
                    )}
                    <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div>
                            <CardTitle>About</CardTitle>
                            <CardDescription>Event information visible to attendees.</CardDescription>
                        </div>
                    </CardHeader>
                    {event.description && <p className="mb-4 text-sm text-ink-700">{event.description}</p>}

                    <div className="grid grid-cols-1 gap-3 text-sm text-ink-700 sm:grid-cols-2">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-ink-400" /> {fmtDateTime(event.starts_at)}</div>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-ink-400" /> {fmtDateTime(event.ends_at)}</div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink-400" /> {event.venue}</div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-ink-400" /> {event.available_seats} / {event.capacity} available</div>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-ink-400" /> Deadline: {fmtDateTime(event.registration_deadline)}</div>
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Capacity</CardTitle>
                            <CardDescription>Live seat availability.</CardDescription>
                        </div>
                    </CardHeader>
                    <div className="text-4xl font-semibold tracking-tight text-ink-900">
                        {event.available_seats}
                        <span className="text-base font-normal text-ink-500"> / {event.capacity}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded bg-ink-100">
                        <div
                            className="h-full bg-ink-900"
                            style={{ width: `${Math.max(0, Math.min(100, ((event.capacity - event.available_seats) / event.capacity) * 100))}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                        {event.capacity - event.available_seats} registered · {event.available_seats} open
                    </p>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Registrations</CardTitle>
                        <CardDescription>People signed up for this event.</CardDescription>
                    </div>
                    <Link to={`/owner/registrations?event=${eventId}`}>
                        <Button variant="outline" size="sm">Open full list</Button>
                    </Link>
                </CardHeader>
                {registrations.isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (registrations.data?.data?.length ?? 0) === 0 ? (
                    <p className="text-sm text-ink-500">No registrations yet.</p>
                ) : (
                    <div>
                        {registrations.data!.data.map(r => <RegistrationRow key={r.id} registration={r} />)}
                    </div>
                )}
            </Card>

            <ConfirmDialog
                open={confirmDelete}
                title="Delete event?"
                description="This will permanently remove the event and all registrations."
                loading={remove.isPending}
                onClose={() => setConfirmDelete(false)}
                onConfirm={() => remove.mutate()}
            />
            <ConfirmDialog
                open={confirmCancel}
                title="Cancel event?"
                description="All attendees will be notified. This cannot be undone."
                loading={cancel.isPending}
                onClose={() => setConfirmCancel(false)}
                onConfirm={() => cancel.mutate()}
            />
        </div>
    );
}
