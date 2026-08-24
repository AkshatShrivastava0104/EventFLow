import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { eventsApi } from '@/api/event';
import { registrationsApi } from '@/api/registrations';
import { RegistrationRow } from '@/components/registrations/RegistrationRow';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

export function StaffEventDetailPage() {
  const { eventId = '' } = useParams();
  const event = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });
  const regs = useQuery({
    queryKey: ['events', eventId, 'registrations'],
    queryFn: () => registrationsApi.forEvent(eventId, { page_size: 100 }),
    enabled: !!eventId,
  });

  if (event.isLoading) return <Skeleton className="h-72" />;
  if (!event.data) return <p className="text-sm text-ink-500">Event not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/staff" className="text-sm text-ink-500 hover:text-ink-900">← Operations</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{event.data.title}</h1>
        </div>
        <Link to={`/staff/check-in?event=${eventId}`}>
          <Button>Open check-in</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Attendees</CardTitle>
            <CardDescription>{event.data.available_seats} of {event.data.capacity} seats available.</CardDescription>
          </div>
        </CardHeader>
        {regs.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          regs.data?.data.map(r => <RegistrationRow key={r.id} registration={r} />)
        )}
      </Card>
    </div>
  );
}
