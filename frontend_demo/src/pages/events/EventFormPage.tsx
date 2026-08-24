import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/events';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const eventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  venue: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional().or(z.nan()).transform(v => Number.isNaN(v) ? undefined : v),
  start_time: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
  end_time: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
  registration_deadline: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
});

type EventForm = z.infer<typeof eventSchema>;

export function EventFormPage() {
  // if url is /organizations/:id/events/new, orgId is id
  // if url is /events/:eventId/edit, eventId is eventId
  const { id, eventId } = useParams<{ id?: string, eventId?: string }>();
  const isEditing = Boolean(eventId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(Number(eventId)),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
  });

  // format date for datetime-local input (YYYY-MM-DDThh:mm)
  const formatDateForInput = (isoString?: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || '',
        venue: event.venue || '',
        capacity: event.capacity || undefined,
        start_time: formatDateForInput(event.start_time),
        end_time: formatDateForInput(event.end_time),
        registration_deadline: formatDateForInput(event.registration_deadline),
      });
    }
  }, [event, reset]);

  const createMutation = useMutation({
    mutationFn: (data: EventForm) => eventsApi.create(Number(id), {
      ...data,
      start_time: data.start_time ? new Date(data.start_time).toISOString() : undefined,
      end_time: data.end_time ? new Date(data.end_time).toISOString() : undefined,
      registration_deadline: data.registration_deadline ? new Date(data.registration_deadline).toISOString() : undefined,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['organization', id, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('Event created successfully');
      navigate(`/events/${res.event_id}`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: EventForm) => eventsApi.update(Number(eventId), {
      ...data,
      start_time: data.start_time ? new Date(data.start_time).toISOString() : undefined,
      end_time: data.end_time ? new Date(data.end_time).toISOString() : undefined,
      registration_deadline: data.registration_deadline ? new Date(data.registration_deadline).toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('Event updated successfully');
      navigate(`/events/${eventId}`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: EventForm) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditing && loadingEvent) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost-sm" 
          onClick={() => navigate(-1)}
          className="w-8 h-8 p-0 rounded-full"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-[24px] font-semibold text-ink">
          {isEditing ? 'Edit Event' : 'Create Event'}
        </h1>
      </div>

      <div className="bg-elevated border border-hairline rounded-[var(--radius-lg)] p-6 shadow-whisper">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-5">
            <Input
              label="Event Title"
              placeholder="e.g. Annual Tech Conference"
              error={errors.title?.message}
              {...register('title')}
            />
            
            <Textarea
              label="Description"
              placeholder="What is this event about?"
              error={errors.description?.message}
              className="min-h-[120px]"
              {...register('description')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Venue / Location"
                placeholder="e.g. Main Hall or Zoom Link"
                error={errors.venue?.message}
                {...register('venue')}
              />
              
              <Input
                label="Capacity"
                type="number"
                placeholder="Leave blank for unlimited"
                error={errors.capacity?.message}
                {...register('capacity', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-hairline-soft pt-5">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                error={errors.start_time?.message}
                {...register('start_time')}
              />
              
              <Input
                label="End Date & Time"
                type="datetime-local"
                error={errors.end_time?.message}
                {...register('end_time')}
              />
            </div>
            
            <Input
              label="Registration Deadline"
              type="datetime-local"
              error={errors.registration_deadline?.message}
              {...register('registration_deadline')}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-hairline-soft">
            <Button 
              type="submit" 
              isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
