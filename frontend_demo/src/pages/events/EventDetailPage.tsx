import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/events';
import { organizationsApi } from '@/api/organizations';
import { registrationsApi } from '@/api/registrations';
import { waitlistApi } from '@/api/waitlist';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { EventStatusBadge } from '@/components/ui/Badge';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import { ArrowLeft, Edit2, Trash2, Calendar, MapPin, Users, Ticket, CheckSquare } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId),
  });

  const { data: org } = useQuery({
    queryKey: ['organization', event?.organization_id],
    queryFn: () => organizationsApi.getById(event!.organization_id),
    enabled: !!event,
  });

  const { data: attendeesData, isLoading: loadingAttendees } = useQuery({
    queryKey: ['event', eventId, 'attendees'],
    queryFn: () => registrationsApi.getEventRegistrations(eventId, 1, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['organization', event?.organization_id, 'events'] });
      showToast.success('Event deleted');
      navigate(`/organizations/${event?.organization_id}`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const actionMutation = useMutation({
    mutationFn: (action: 'publish' | 'cancel' | 'complete') => eventsApi[action](eventId),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      showToast.success(`Event ${action}ed successfully`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const registerMutation = useMutation({
    mutationFn: () => registrationsApi.register(eventId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'attendees'] });
      queryClient.invalidateQueries({ queryKey: ['registrations', 'me'] });
      if (res.status === 'waitlisted') {
        showToast.warning(`Event is full. You've been added to the waitlist.`);
      } else {
        showToast.success('Successfully registered for the event!');
      }
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  if (loadingEvent) return <SkeletonCard />;
  if (!event) return <div>Event not found</div>;

  const isOrganizer = org?.owner_id === user?.id; // Simplify for now (could check org members)
  
  // Checking if the user is already registered (from attendee list for now, usually needs a specific endpoint)
  const myRegistration = attendeesData?.attendees.find(a => a.user_id === user?.id && a.status === 'active');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Button variant="ghost-sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />} className="mb-4">
          Back
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <EventStatusBadge status={event.status} />
              <span className="text-[14px] text-mute">{org?.name}</span>
            </div>
            <h1 className="text-[32px] font-semibold tracking-[-1.28px] text-ink">{event.title}</h1>
            <p className="text-[16px] text-body mt-2 max-w-2xl">{event.description || 'No description provided.'}</p>
          </div>
          
          {isOrganizer && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(`/events/${event.id}/edit`)} leftIcon={<Edit2 size={16} />}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} leftIcon={<Trash2 size={16} />}>
                  Delete
                </Button>
              </div>
              {event.status === 'draft' && (
                <Button onClick={() => actionMutation.mutate('publish')} isLoading={actionMutation.isPending}>Publish Event</Button>
              )}
              {event.status === 'published' && (
                <Button variant="secondary" onClick={() => actionMutation.mutate('cancel')} isLoading={actionMutation.isPending}>Cancel Event</Button>
              )}
              {event.status === 'published' && (
                <Button variant="secondary" onClick={() => actionMutation.mutate('complete')} isLoading={actionMutation.isPending}>Mark Completed</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <h2 className="text-[18px] font-medium text-ink mb-4 border-b border-hairline pb-2">Event Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <Calendar className="text-mute mt-0.5" size={20} />
                <div>
                  <p className="text-[14px] font-medium text-ink">Date & Time</p>
                  <p className="text-[14px] text-body">{formatDate(event.start_time)}</p>
                  <p className="text-[14px] text-body">{event.end_time ? `Until ${formatDate(event.end_time)}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="text-mute mt-0.5" size={20} />
                <div>
                  <p className="text-[14px] font-medium text-ink">Venue</p>
                  <p className="text-[14px] text-body">{event.venue || 'TBA'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="text-mute mt-0.5" size={20} />
                <div>
                  <p className="text-[14px] font-medium text-ink">Capacity</p>
                  <p className="text-[14px] text-body">{event.capacity ? `${event.capacity} people` : 'Unlimited'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckSquare className="text-mute mt-0.5" size={20} />
                <div>
                  <p className="text-[14px] font-medium text-ink">Registration Deadline</p>
                  <p className="text-[14px] text-body">{event.registration_deadline ? formatDate(event.registration_deadline) : 'None'}</p>
                </div>
              </div>
            </div>
          </Card>

          {isOrganizer && (
            <Card>
              <div className="flex items-center justify-between border-b border-hairline pb-2 mb-4">
                <h2 className="text-[18px] font-medium text-ink">Attendees ({attendeesData?.pagination.total || 0})</h2>
                <Link to={`/checkin/${event.id}`}>
                  <Button variant="secondary" size="sm" leftIcon={<Ticket size={16} />}>Check-in Mode</Button>
                </Link>
              </div>
              
              {loadingAttendees ? (
                <div className="text-center text-mute py-4">Loading attendees...</div>
              ) : attendeesData?.attendees.length === 0 ? (
                <div className="text-center text-mute py-4">No attendees yet.</div>
              ) : (
                <ul className="divide-y divide-hairline">
                  {attendeesData?.attendees.map(a => (
                    <li key={a.registration_id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-[14px] font-medium text-ink">{a.name}</p>
                        <p className="text-[12px] text-mute">{a.email}</p>
                      </div>
                      <span className="text-[12px] px-2 py-1 bg-hairline-soft rounded-full text-body capitalize">{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24">
            <h2 className="text-[18px] font-medium text-ink mb-2">Registration</h2>
            
            {event.status === 'draft' ? (
              <p className="text-[14px] text-body mb-4">This event is not published yet.</p>
            ) : event.status === 'cancelled' ? (
              <p className="text-[14px] text-error mb-4">This event has been cancelled.</p>
            ) : event.status === 'completed' ? (
              <p className="text-[14px] text-body mb-4">This event has already ended.</p>
            ) : myRegistration ? (
              <div>
                <p className="text-[14px] text-success font-medium mb-4 flex items-center gap-2">
                  <CheckSquare size={18} /> You are registered!
                </p>
                <Link to="/registrations">
                  <Button className="w-full">View Registration</Button>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-[14px] text-body mb-6">Register now to secure your spot.</p>
                <Button 
                  className="w-full" 
                  onClick={() => registerMutation.mutate(undefined)} 
                  isLoading={registerMutation.isPending}
                >
                  Register for Event
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate(eventId)}
        title="Delete Event"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
