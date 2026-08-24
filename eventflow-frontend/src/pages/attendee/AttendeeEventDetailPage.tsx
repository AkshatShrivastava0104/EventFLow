import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin, Users, Hourglass } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { eventsApi } from '@/api/event';
import { registrationsApi } from '@/api/registrations';
import { waitlistApi } from '@/api/waitlist';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';
import { fmtDateTime } from '@/lib/format';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AttendeeEventDetailPage() {
  const params = useParams();
  const eventIdSafe = params.eventId ?? '';

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const event = useQuery({
    queryKey: ['events', eventIdSafe],
    queryFn: () => eventsApi.get(eventIdSafe),
  });

  const myReg = useQuery({
    queryKey: ['registrations', 'me', eventIdSafe],
    queryFn: async () => {
      const r = await registrationsApi.mine({ page_size: 100 });
      return r.data.find(x => x.event_id === eventIdSafe) ?? null;
    },
  });

  const register = useMutation({
    mutationFn: () => registrationsApi.register(eventIdSafe),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['events', eventIdSafe] });
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (r.status === 'waitlisted') {
        toast.warning(`Event is full — you’re #${r.waitlist_position ?? '?'} on the waitlist.`);
      } else {
        toast.success('You are registered!');
      }
    },
    onError: (e) => {
      const err = normalizeError(e);
      if (err.status === 409) {
        toast.error('You are already registered for this event.');
      } else if (err.status === 422) {
        toast.error('This event is no longer accepting registrations.');
      } else {
        toast.error(err.message);
      }
    },
  });

  const joinWaitlist = useMutation({
    mutationFn: () => waitlistApi.join(eventIdSafe),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('You joined the waitlist.');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const cancelReg = useMutation({
    mutationFn: async () => {
      if (!myReg.data) throw new Error('No registration found.');
      await registrationsApi.cancel(myReg.data.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', eventIdSafe] });
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Registration cancelled. The next person on the waitlist will be promoted automatically.');
      setConfirmCancel(false);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  if (event.isLoading) return <Skeleton className="h-72" />;
  if (!event.data) return <p className="text-sm text-ink-500">Event not found.</p>;

  const e = event.data;
  const isPublished = e.status === 'published';
  const isFull = e.available_seats <= 0;
  const pastDeadline = new Date(e.registration_deadline) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <Link to="/app/events" className="text-sm text-ink-500 hover:text-ink-900">← Discover</Link>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink-900">
          {e.title}
          <EventStatusBadge status={e.status} />
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>About this event</CardTitle>
            </div>
          </CardHeader>
          {e.description && <p className="mb-4 text-sm text-ink-700">{e.description}</p>}
          <div className="grid grid-cols-1 gap-3 text-sm text-ink-700 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-ink-400" /> {fmtDateTime(e.starts_at)}</div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-ink-400" /> Ends {fmtDateTime(e.ends_at)}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink-400" /> {e.venue}</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-ink-400" /> {e.available_seats} of {e.capacity} seats available</div>
            <div className="flex items-center gap-2"><Hourglass className="h-4 w-4 text-ink-400" /> Deadline: {fmtDateTime(e.registration_deadline)}</div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your spot</CardTitle>
              <CardDescription>Register, waitlist, or cancel.</CardDescription>
            </div>
          </CardHeader>

          {myReg.data ? (
            <div className="space-y-3">
              <Alert
                tone={myReg.data.status === 'waitlisted' ? 'warning' : 'success'}
                title={
                  myReg.data.status === 'waitlisted'
                    ? `You're #${myReg.data.waitlist_position ?? '?'} on the waitlist`
                    : myReg.data.status === 'cancelled'
                      ? 'Your registration was cancelled'
                      : 'You are registered'
                }
              >
                {myReg.data.status === 'waitlisted'
                  ? 'We will notify you if a spot opens up.'
                  : 'You will receive a ticket soon.'}
              </Alert>
              {myReg.data.status !== 'cancelled' && (
                <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancel registration</Button>
              )}
            </div>
          ) : !isPublished ? (
            <Alert tone="info">This event is not open for registration.</Alert>
          ) : pastDeadline ? (
            <Alert tone="warning">The registration deadline has passed.</Alert>
          ) : (
            <div className="space-y-2">
              {isFull ? (
                <Button onClick={() => joinWaitlist.mutate()} loading={joinWaitlist.isPending} className="w-full">
                  Join waitlist
                </Button>
              ) : (
                <Button onClick={() => register.mutate()} loading={register.isPending} className="w-full">
                  Register now
                </Button>
              )}
              {isFull && (
                <p className="text-xs text-ink-500">
                  This event is full. Joining the waitlist is free and you will be notified if a seat becomes available.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel your registration?"
        description={
          myReg.data?.status === 'waitlisted'
            ? 'You will be removed from the waitlist.'
            : 'Your seat will be released and offered to the next person on the waitlist.'
        }
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelReg.mutate()}
        loading={cancelReg.isPending}
      />
    </div>
  );
}
