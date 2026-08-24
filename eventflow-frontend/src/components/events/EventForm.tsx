import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const schema = z.object({
  title: z.string().min(3, 'Title is too short').max(120),
  description: z.string().max(2000).optional(),
  venue: z.string().min(2),
  capacity: z.coerce.number().int().positive().max(100000),
  registration_deadline: z.string().min(1, 'Required'),
  starts_at: z.string().min(1, 'Required'),
  ends_at: z.string().min(1, 'Required'),
}).refine(d => new Date(d.ends_at) > new Date(d.starts_at), {
  message: 'End must be after start',
  path: ['ends_at'],
}).refine(d => new Date(d.registration_deadline) <= new Date(d.starts_at), {
  message: 'Registration deadline must be before event start',
  path: ['registration_deadline'],
});

export type EventFormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<EventFormValues>;
  onSubmit: (v: EventFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}

const toLocalInput = (iso?: string) =>
  iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '';

export function EventForm({ defaultValues, onSubmit, submitting, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', description: '', venue: '', capacity: 50,
      ...defaultValues,
      registration_deadline: toLocalInput(defaultValues?.registration_deadline),
      starts_at: toLocalInput(defaultValues?.starts_at),
      ends_at: toLocalInput(defaultValues?.ends_at),
    },
  });

  return (
    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="md:col-span-2">
        <Input label="Title" {...register('title')} error={errors.title?.message} />
      </div>
      <div className="md:col-span-2">
        <Textarea label="Description" {...register('description')} error={errors.description?.message} />
      </div>
      <Input label="Venue" {...register('venue')} error={errors.venue?.message} />
      <Input label="Capacity" type="number" min={1} {...register('capacity')} error={errors.capacity?.message} />
      <Input
        label="Registration deadline" type="datetime-local"
        {...register('registration_deadline')} error={errors.registration_deadline?.message}
      />
      <div />
      <Input
        label="Starts at" type="datetime-local"
        {...register('starts_at')} error={errors.starts_at?.message}
      />
      <Input
        label="Ends at" type="datetime-local"
        {...register('ends_at')} error={errors.ends_at?.message}
      />
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
