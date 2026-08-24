import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  Ticket,
  Users,
} from 'lucide-react';
import { eventsApi } from '@/api/events';
import { registrationsApi } from '@/api/registrations';
import { ticketsApi } from '@/api/tickets';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDateTime, fmtDate } from '@/lib/format';
import { registrationStatusMeta } from '@/lib/constants';
import { normalizeError } from '@/api/client';

export function AppEventDetail() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const eventQ = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id),
    enabled: Number.isFinite(id),
  });
  const myRegsQ = useQuery({
    queryKey: ['registrations', 'mine', 'all'],
    queryFn: () => registrationsApi.mine({ page: 1, limit: 100 }),
  });

  const invalidateRegs = () =>
    qc.invalidateQueries({ queryKey: ['registrations', 'mine'] });

  const myReg = myRegsQ.data?.registrations.find(
    (r) => r.event_id === id && r.status.toLowerCase() !== 'cancelled',
  );

  const register = useMutation({
    mutationFn: () => registrationsApi.register(id),
    onSuccess: async (res) => {
      await invalidateRegs();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(
        res.waitlist_id
          ? 'You joined the waitlist for this event.'
          : res.message || 'You are registered!',
      );
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const cancel = useMutation({
    mutationFn: (registrationId: number) => registrationsApi.cancel(registrationId),
    onSuccess: async () => {
      await invalidateRegs();
      toast.success('Registration cancelled');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const generateTicket = useMutation({
    mutationFn: (registrationId: number) => ticketsApi.create(registrationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tickets', 'mine'] });
      toast.success('Ticket generated');
      navigate('/app/tickets');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const event = eventQ.data;
  const deadlinePassed =
    !!event?.registration_deadline &&
    new Date(event.registration_deadline).getTime() < Date.now();
  const canRegister = event?.status === 'published' && !myReg && !deadlinePassed;
  const regMeta = myReg ? registrationStatusMeta(myReg.status) : null;

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link
            to="/app"
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Discover
          </Link>
        }
        title={event?.title ?? 'Event'}
      />

      {eventQ.error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(eventQ.error).message}
        </Alert>
      )}

      {eventQ.isLoading || !event ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <div className="mb-4">
                <EventStatusBadge status={event.status} />
              </div>
              {event.description ? (
                <p className="whitespace-pre-line text-sm text-ink-700">{event.description}</p>
              ) : (
                <p className="text-sm italic text-ink-400">No description provided.</p>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Starts"
                  value={fmtDateTime(event.start_time)}
                />
                <Detail
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Ends"
                  value={fmtDateTime(event.end_time)}
                />
                <Detail
                  icon={<MapPin className="h-4 w-4" />}
                  label="Venue"
                  value={event.venue || '—'}
                />
                <Detail
                  icon={<Users className="h-4 w-4" />}
                  label="Capacity"
                  value={event.capacity != null ? String(event.capacity) : 'Unlimited'}
                />
                <Detail
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Registration deadline"
                  value={fmtDateTime(event.registration_deadline)}
                />
              </dl>
            </Card>
          </div>

          {/* Registration CTA */}
          <div>
            <Card>
              {myReg ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm text-ink-500">Your registration</p>
                    <div className="mt-1.5">
                      {regMeta && <Badge tone={regMeta.tone}>{regMeta.label}</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-ink-400">
                      Registered on {fmtDate(myReg.created_at)}
                    </p>
                  </div>
                  <Button
                    icon={<Ticket className="h-4 w-4" />}
                    loading={generateTicket.isPending}
                    onClick={() => generateTicket.mutate(myReg.id)}
                  >
                    Generate ticket
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger-600 hover:bg-danger-50"
                    loading={cancel.isPending}
                    onClick={() => cancel.mutate(myReg.id)}
                  >
                    Cancel registration
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">Reserve your spot</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {event.status !== 'published'
                        ? 'Registration is not open for this event.'
                        : deadlinePassed
                          ? 'The registration deadline has passed.'
                          : 'Register now to secure your place.'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    disabled={!canRegister}
                    loading={register.isPending}
                    onClick={() => register.mutate()}
                  >
                    {deadlinePassed ? 'Registration closed' : 'Register'}
                  </Button>
                  {event.capacity != null && (
                    <p className="text-xs text-ink-400">
                      If the event is full, you'll be added to the waitlist automatically.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink-800">{value}</dd>
    </div>
  );
}
