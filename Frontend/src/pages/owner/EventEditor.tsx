import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { EventsAPI, OrgsAPI } from '../../lib/queries';
import {
  Input,
  TextArea,
  Select,
} from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { slugify } from '../../lib/utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Sparkles,
  Trash2,
} from 'lucide-react';

const CATEGORIES = [
  'Music',
  'Technology',
  'Art',
  'Sports',
  'Education',
  'Food & Drink',
  'Business',
  'Community',
];

const empty = {
  title: '',
  slug: '',
  description: '',
  category: 'Music',
  cover_image: '',
  venue: '',
  address: '',
  city: '',
  country: 'USA',
  start_at: '',
  end_at: '',
  price: 0,
  capacity: 100,
  status: 'draft' as const,
  tags: [] as string[],
  featured: false,
};

export function EventEditor() {
  const { id } = useParams();
  const nav = useNavigate();

  const {
    user,
    role,
  } = useAuth();

  const isEdit = !!id;

  const [form, setForm] = useState<any>(empty);
  const [tagInput, setTagInput] = useState('');

  const {
    data: organizations = [],
    isLoading: organizationsLoading,
  } = useQuery({
    queryKey: ['organizations', 'event-editor'],
    queryFn: () => OrgsAPI.list(),
    enabled: role === 'admin',
  });

  const organization = organizations[0];

  const {
    data: existing,
    isLoading: existingLoading,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => EventsAPI.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) {
      return;
    }

    const eventData = existing as any;

    const startValue =
      eventData.start_time ||
      eventData.start_at ||
      '';

    const endValue =
      eventData.end_time ||
      eventData.end_at ||
      '';

    setForm({
      ...empty,

      title: eventData.title || '',
      slug: eventData.slug || '',
      description: eventData.description || '',
      category: eventData.category || 'Music',
      cover_image: eventData.cover_image || '',

      venue: eventData.venue || '',
      address: eventData.address || '',
      city: eventData.city || '',
      country: eventData.country || 'USA',

      start_at: startValue
        ? new Date(startValue)
          .toISOString()
          .slice(0, 16)
        : '',

      end_at: endValue
        ? new Date(endValue)
          .toISOString()
          .slice(0, 16)
        : '',

      price:
        eventData.price !== undefined &&
          eventData.price !== null
          ? Number(eventData.price)
          : 0,

      capacity:
        eventData.capacity !== undefined &&
          eventData.capacity !== null
          ? Number(eventData.capacity)
          : 100,

      status: eventData.status || 'draft',

      tags: Array.isArray(eventData.tags)
        ? eventData.tags
        : [],

      featured: !!eventData.featured,
    });
  }, [existing]);

  const set = (
    key: string,
    value: any,
  ) => {
    setForm((current: any) => ({
      ...current,
      [key]: value,
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (
        role === 'admin' &&
        !organization?.id
      ) {
        throw new Error(
          'No organization found for this account.',
        );
      }

      if (!form.title?.trim()) {
        throw new Error(
          'Event title is required.',
        );
      }

      if (!form.start_at) {
        throw new Error(
          'Start date and time are required.',
        );
      }

      if (!form.end_at) {
        throw new Error(
          'End date and time are required.',
        );
      }

      const startDate =
        new Date(form.start_at);

      const endDate =
        new Date(form.end_at);

      if (
        Number.isNaN(
          startDate.getTime(),
        )
      ) {
        throw new Error(
          'Invalid start date.',
        );
      }

      if (
        Number.isNaN(
          endDate.getTime(),
        )
      ) {
        throw new Error(
          'Invalid end date.',
        );
      }

      if (endDate <= startDate) {
        throw new Error(
          'End time must be after start time.',
        );
      }

      const price = Number(form.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(
          'Ticket price must be 0 or greater.',
        );
      }

      const capacity = Number(form.capacity);

      if (
        !Number.isFinite(capacity) ||
        capacity <= 0
      ) {
        throw new Error(
          'Capacity must be greater than 0.',
        );
      }

      const payload: any = {
        title: form.title.trim(),

        description:
          form.description?.trim() || '',

        venue:
          form.venue?.trim() || '',

        capacity,

        start_time:
          startDate.toISOString(),

        end_time:
          endDate.toISOString(),

        // INR is the only supported currency.
        price,
      };

      if (role === 'admin') {
        payload.organization_id =
          Number(organization.id);
      }

      if (form.slug) {
        payload.slug = form.slug;
      }

      if (form.category) {
        payload.category =
          form.category;
      }

      if (form.cover_image) {
        payload.cover_image =
          form.cover_image;
      }

      if (form.address) {
        payload.address =
          form.address;
      }

      if (form.city) {
        payload.city =
          form.city;
      }

      if (form.country) {
        payload.country =
          form.country;
      }

      if (Array.isArray(form.tags)) {
        payload.tags =
          form.tags;
      }

      payload.featured =
        !!form.featured;

      if (isEdit) {
        return EventsAPI.update(
          Number(id),
          payload,
        );
      }

      return EventsAPI.create(
        payload,
      );
    },

    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Event updated'
          : 'Event created',
      );

      if (role === 'admin') {
        nav('/admin/events', {
          replace: true,
        });
      } else {
        nav('/dashboard/events', {
          replace: true,
        });
      }
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to save event',
      );
    },
  });

  const addTag = () => {
    const tag =
      tagInput.trim();

    if (!tag) {
      return;
    }

    if (
      form.tags?.some(
        (item: string) =>
          item.toLowerCase() ===
          tag.toLowerCase(),
      )
    ) {
      setTagInput('');
      return;
    }

    set('tags', [
      ...(form.tags || []),
      tag,
    ]);

    setTagInput('');
  };

  const removeTag = (
    tagToRemove: string,
  ) => {
    set(
      'tags',
      (form.tags || []).filter(
        (tag: string) =>
          tag !== tagToRemove,
      ),
    );
  };

  if (
    existingLoading ||
    (role === 'admin' &&
      organizationsLoading)
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-ink-500">
        Loading event editor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {isEdit
              ? 'Edit event'
              : 'Create a new event'}
          </h2>

          <p className="text-sm text-ink-500">
            Fill in the details, save as draft,
            then publish when ready.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={save.isPending}
            onClick={() => {
              set(
                'status',
                'draft',
              );

              save.mutate();
            }}
          >
            Save as draft
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              set(
                'status',
                'published',
              );

              save.mutate();
            }}
            loading={save.isPending}
            leftIcon={
              <Sparkles className="h-4 w-4" />
            }
          >
            Publish
          </Button>
        </div>
      </div>

      {role === 'admin' &&
        organization && (
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Organization
            </p>

            <p className="mt-1 font-display text-lg font-semibold">
              {organization.name}
            </p>

            <p className="mt-1 text-xs text-ink-500">
              This event will be created under
              this organization.
            </p>
          </div>
        )}

      {role === 'admin' &&
        !organization && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            No organization is associated with
            this account. You cannot create an
            organization event until an
            organization is available.
          </div>
        )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
            <h3 className="font-display text-lg font-semibold">
              Event details
            </h3>

            <Input
              label="Event title"
              value={form.title}
              onChange={(e) =>
                set(
                  'title',
                  e.target.value,
                )
              }
              placeholder="e.g. Neon Nights 2026"
            />

            <Input
              label="URL slug"
              value={form.slug}
              onChange={(e) =>
                set(
                  'slug',
                  e.target.value,
                )
              }
              placeholder={slugify(
                form.title ||
                'my-event',
              )}
              hint="Used in the public URL"
            />

            <TextArea
              label="Description"
              value={form.description}
              onChange={(e) =>
                set(
                  'description',
                  e.target.value,
                )
              }
              placeholder="What's this event about?"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={form.category}
                onChange={(e) =>
                  set(
                    'category',
                    e.target.value,
                  )
                }
              >
                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </Select>

              <Input
                label="Cover image URL (optional)"
                value={
                  form.cover_image ||
                  ''
                }
                onChange={(e) =>
                  set(
                    'cover_image',
                    e.target.value,
                  )
                }
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
            <h3 className="font-display text-lg font-semibold">
              Venue & timing
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Venue name"
                value={form.venue}
                onChange={(e) =>
                  set(
                    'venue',
                    e.target.value,
                  )
                }
              />

              <Input
                label="Address"
                value={form.address}
                onChange={(e) =>
                  set(
                    'address',
                    e.target.value,
                  )
                }
              />

              <Input
                label="City"
                value={form.city}
                onChange={(e) =>
                  set(
                    'city',
                    e.target.value,
                  )
                }
              />

              <Input
                label="Country"
                value={form.country}
                onChange={(e) =>
                  set(
                    'country',
                    e.target.value,
                  )
                }
              />

              <Input
                label="Starts at"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) =>
                  set(
                    'start_at',
                    e.target.value,
                  )
                }
              />

              <Input
                label="Ends at"
                type="datetime-local"
                value={form.end_at}
                onChange={(e) =>
                  set(
                    'end_at',
                    e.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
            <h3 className="font-display text-lg font-semibold">
              Tickets & capacity
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Price (₹0 for free)
                </label>

                <div className="flex h-10 overflow-hidden rounded-lg border border-ink-200 bg-white transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                  <div className="flex items-center border-r border-ink-200 bg-ink-50 px-3 text-base font-semibold text-ink-700">
                    ₹
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price === 0 ? '' : form.price}
                    onChange={(e) =>
                      set(
                        'price',
                        e.target.value === ''
                          ? 0
                          : Number(
                            e.target.value,
                          ),
                      )
                    }
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-ink-900 outline-none"
                    placeholder="0"
                  />
                </div>

                <p className="mt-1 text-xs text-ink-500">
                  ₹0 means the event is free.
                </p>
              </div>

              <Input
                label="Capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  set(
                    'capacity',
                    e.target.value === ''
                      ? 0
                      : Number(
                        e.target.value,
                      ),
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
            <h3 className="font-display text-lg font-semibold">
              Tags
            </h3>

            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) =>
                  setTagInput(
                    e.target.value,
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag"
                className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500"
              />

              <Button
                variant="outline"
                onClick={addTag}
                type="button"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(form.tags || []).map(
                (tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold"
                  >
                    #{tag}

                    <button
                      type="button"
                      onClick={() =>
                        removeTag(tag)
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-20">
          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
            <div className="aspect-video bg-gradient-to-br from-brand-500 to-sky-500">
              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="p-4">
              <p className="text-xs font-semibold uppercase text-brand-600">
                {form.category}
              </p>

              <p className="mt-1 font-display text-lg font-semibold">
                {form.title ||
                  'Your event title'}
              </p>

              <p className="mt-1 text-xs text-ink-500">
                {form.venue ||
                  'Venue'}{' '}
                •{' '}
                {form.city ||
                  'City'}
              </p>

              <p className="mt-2 text-sm font-semibold text-ink-800">
                {Number(form.price) > 0
                  ? `₹${Number(form.price).toLocaleString('en-IN')}`
                  : 'Free'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4 text-sm">
            <p className="font-semibold">
              Publishing checklist
            </p>

            <ul className="mt-2 space-y-1 text-ink-600">
              <li>
                • Add a compelling title and description
              </li>

              <li>
                • Include venue and date/time
              </li>

              <li>
                • Set a realistic capacity
              </li>

              <li>
                • Add tags for discoverability
              </li>
            </ul>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-ink-200 bg-white p-4">
            <div>
              <p className="font-semibold">
                Featured event
              </p>

              <p className="text-xs text-ink-500">
                Show on the homepage
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                !!form.featured
              }
              onChange={(e) =>
                set(
                  'featured',
                  e.target.checked,
                )
              }
              className="h-4 w-4 accent-brand-500"
            />
          </label>
        </aside>
      </div>
    </div>
  );
}