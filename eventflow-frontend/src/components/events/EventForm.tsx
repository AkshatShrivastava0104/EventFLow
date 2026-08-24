import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { EventItem, EventPayload } from '@/types/event';

/** Convert an ISO timestamp to a value a datetime-local input accepts (local time). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v?: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Keep it under 200 characters'),
    description: z.string().max(5000).optional(),
    venue: z.string().max(300).optional(),
    capacity: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && Number(v) > 0), {
        message: 'Enter a positive whole number',
      }),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    registration_deadline: z.string().optional(),
  })
  .refine(
    (d) => !(d.start_time && d.end_time) || new Date(d.end_time) >= new Date(d.start_time),
    { message: 'End time must be after the start time', path: ['end_time'] },
  );

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<EventItem>;
  onSubmit: (payload: EventPayload) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function EventForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Save event',
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      venue: defaultValues?.venue ?? '',
      capacity: defaultValues?.capacity != null ? String(defaultValues.capacity) : '',
      start_time: toLocalInput(defaultValues?.start_time),
      end_time: toLocalInput(defaultValues?.end_time),
      registration_deadline: toLocalInput(defaultValues?.registration_deadline),
    },
  });

  const submit = handleSubmit((values) =>
    onSubmit({
      title: values.title.trim(),
      description: values.description?.trim() || '',
      venue: values.venue?.trim() || '',
      capacity: values.capacity ? Number(values.capacity) : null,
      start_time: fromLocalInput(values.start_time),
      end_time: fromLocalInput(values.end_time),
      registration_deadline: fromLocalInput(values.registration_deadline),
    }),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Input
        label="Event title"
        placeholder="e.g. Annual Developer Conference"
        error={errors.title?.message}
        {...register('title')}
      />

      <Textarea
        label="Description"
        placeholder="What is this event about?"
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Venue"
          placeholder="e.g. Main Auditorium"
          error={errors.venue?.message}
          {...register('venue')}
        />
        <Input
          label="Capacity"
          type="number"
          min={1}
          placeholder="Leave blank for unlimited"
          error={errors.capacity?.message}
          {...register('capacity')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Start time"
          type="datetime-local"
          error={errors.start_time?.message}
          {...register('start_time')}
        />
        <Input
          label="End time"
          type="datetime-local"
          error={errors.end_time?.message}
          {...register('end_time')}
        />
      </div>

      <Input
        label="Registration deadline"
        type="datetime-local"
        hint="Attendees can no longer register after this time."
        error={errors.registration_deadline?.message}
        {...register('registration_deadline')}
      />

      <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
