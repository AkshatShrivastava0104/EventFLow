import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { EventsAPI, OrgsAPI } from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
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
  Upload,
  X,
  Image as ImageIcon,
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
  cover_media_url: '',
  cover_media_type: 'image',
  venue: '',
  address: '',
  city: '',
  country: 'India',
  start_at: '',
  end_at: '',
  registration_deadline: '',
  price: 0,
  capacity: 100,
  max_tickets_per_user: 1,
  allow_waitlist: false,
  visibility: 'public',
  status: 'draft' as const,
  tags: [] as string[],
  featured: false,
};

export function EventEditor() {
  const { id } = useParams();
  const nav = useNavigate();

  const {
    role,
  } = useAuth();

  const isEdit = !!id;

  const [form, setForm] = useState<any>(empty);
  const [tagInput, setTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedMedia, setSelectedMedia] =
    useState<File | null>(null);

  const [mediaPreview, setMediaPreview] =
    useState<string>('');

  const [mediaUploading, setMediaUploading] =
    useState(false);

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
    if (!isEdit) {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }

      setSelectedMedia(null);
      setMediaPreview('');
      setForm({ ...empty });
      setTagInput('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

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

    const registrationDeadline =
      eventData.registration_deadline || '';

    const existingMediaURL =
      eventData.cover_media_url ||
      eventData.cover_image ||
      '';

    const existingMediaType = 'image';

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setSelectedMedia(null);
    setMediaPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setForm({
      ...empty,

      title: eventData.title || '',
      slug: eventData.slug || '',
      description: eventData.description || '',
      category: eventData.category || 'Music',

      cover_image: existingMediaURL,
      cover_media_url: existingMediaURL,
      cover_media_type: existingMediaType,

      venue: eventData.venue || '',
      address: eventData.address || '',
      city: eventData.city || '',
      country: eventData.country || 'India',

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

      registration_deadline:
        registrationDeadline
          ? new Date(registrationDeadline)
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

      max_tickets_per_user:
        eventData.max_tickets_per_user !==
          undefined &&
          eventData.max_tickets_per_user !== null
          ? Number(eventData.max_tickets_per_user)
          : 1,

      allow_waitlist:
        !!eventData.allow_waitlist,

      visibility:
        eventData.visibility || 'public',

      status:
        eventData.status || 'draft',

      tags:
        Array.isArray(eventData.tags)
          ? eventData.tags
          : [],

      featured:
        !!eventData.featured,
    });
  }, [existing, id, isEdit]);

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const set = (
    key: string,
    value: any,
  ) => {
    setForm((current: any) => ({
      ...current,
      [key]: value,
    }));
  };

  /*
   * ========================================================
   * MEDIA SELECTION
   * ========================================================
   */

  const handleMediaSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedImageTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]);

    if (!allowedImageTypes.has(file.type)) {
      toast.error(
        'Please select a JPG, JPEG, PNG, WEBP, or GIF image.',
      );

      event.target.value = '';
      return;
    }

    const maxSize = 100 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        'File size cannot exceed 100 MB.',
      );

      event.target.value = '';
      return;
    }

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    const previewURL =
      URL.createObjectURL(file);

    setSelectedMedia(file);
    setMediaPreview(previewURL);

    setForm((current: any) => ({
      ...current,
      cover_media_type: 'image',
    }));
  };

  const removeSelectedMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setSelectedMedia(null);
    setMediaPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /*
   * Upload the selected file after the event exists.
   *
   * This is intentionally separate from event creation
   * because the backend upload endpoint needs event_id.
   */
  const uploadMedia = async (
    eventId: number,
  ) => {
    if (!selectedMedia) {
      return null;
    }

    setMediaUploading(true);

    try {
      const result =
        await EventsAPI.uploadMedia(
          eventId,
          selectedMedia,
        );

      const mediaURL =
        result?.url ||
        result?.media_url ||
        '';


      const mediaType = 'image';

      if (!mediaURL) {
        throw new Error(
          'Upload succeeded but no media URL was returned.',
        );
      }

      setForm((current: any) => ({
        ...current,
        cover_image: mediaURL,
        cover_media_url: mediaURL,
        cover_media_type: mediaType,
      }));

      setSelectedMedia(null);
      setMediaPreview('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success(
        'Event cover image uploaded successfully',
      );

      return {
        url: mediaURL,
        media_type: mediaType,
      };
    } finally {
      setMediaUploading(false);
    }
  };

  /*
   * ========================================================
   * BUILD PAYLOAD
   * ========================================================
   */

  const buildPayload = () => {
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

    let registrationDeadline:
      Date | null = null;

    if (form.registration_deadline) {
      registrationDeadline =
        new Date(
          form.registration_deadline,
        );

      if (
        Number.isNaN(
          registrationDeadline.getTime(),
        )
      ) {
        throw new Error(
          'Invalid registration deadline.',
        );
      }

      if (
        registrationDeadline >=
        startDate
      ) {
        throw new Error(
          'Registration deadline must be before the event starts.',
        );
      }
    }

    const price =
      Number(form.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        'Ticket price must be 0 or greater.',
      );
    }

    const capacity =
      Number(form.capacity);

    if (
      !Number.isFinite(capacity) ||
      capacity <= 0
    ) {
      throw new Error(
        'Capacity must be greater than 0.',
      );
    }

    const maxTicketsPerUser =
      Number(
        form.max_tickets_per_user,
      );

    if (
      !Number.isFinite(
        maxTicketsPerUser,
      ) ||
      maxTicketsPerUser <= 0
    ) {
      throw new Error(
        'Maximum tickets per user must be greater than 0.',
      );
    }

    const visibility =
      form.visibility === 'private'
        ? 'private'
        : 'public';

    const mediaURL =
      form.cover_media_url ||
      form.cover_image ||
      '';

    const payload: any = {
      title: form.title.trim(),

      slug:
        form.slug?.trim() ||
        slugify(form.title.trim()),

      description:
        form.description?.trim() || '',

      venue:
        form.venue?.trim() || '',

      address:
        form.address?.trim() || '',

      city:
        form.city?.trim() || '',

      country:
        form.country?.trim() || 'India',

      category:
        form.category?.trim() || 'Music',

      /*
       * Keep cover_image for the current backend/database.
       */
      cover_image: mediaURL,

      /*
       * These are harmless when the backend starts
       * persisting media metadata.
       */
      cover_media_url: mediaURL,
      cover_media_type: 'image',

      tags:
        Array.isArray(form.tags)
          ? form.tags
          : [],

      featured:
        !!form.featured,

      visibility,

      capacity,

      max_tickets_per_user:
        maxTicketsPerUser,

      allow_waitlist:
        !!form.allow_waitlist,

      registration_deadline:
        registrationDeadline
          ? registrationDeadline.toISOString()
          : null,

      start_time:
        startDate.toISOString(),

      end_time:
        endDate.toISOString(),

      price,
    };

    if (role === 'admin') {
      payload.organization_id =
        Number(organization.id);
    }

    return payload;
  };

  /*
   * ========================================================
   * SAVE EVENT
   * ========================================================
   */

  const save = useMutation({
    mutationFn: async () => {
      const payload =
        buildPayload();

      if (isEdit) {
        const updated =
          await EventsAPI.update(
            Number(id),
            payload,
          );

        /*
         * Upload newly selected media after
         * successfully updating the event.
         */
        if (selectedMedia) {
          await uploadMedia(
            Number(id),
          );
        }

        return updated;
      }

      /*
       * New event must be created first because
       * upload endpoint needs event ID.
       */
      const created =
        await EventsAPI.create(
          payload,
        );

      const createdEventID =
        Number(
          (created as any)?.id ??
          (created as any)?.event_id,
        );

      if (
        selectedMedia &&
        Number.isFinite(createdEventID) &&
        createdEventID > 0
      ) {
        await uploadMedia(
          createdEventID,
        );
      }

      return created;
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

  /*
   * ========================================================
   * PUBLISH
   * ========================================================
   */

  const publish = useMutation({
    mutationFn: async () => {
      if (!isEdit) {
        const payload =
          buildPayload();

        const created =
          await EventsAPI.create(
            payload,
          );

        const createdEventID =
          Number(
            (created as any)?.id ??
            (created as any)?.event_id,
          );

        if (
          !Number.isFinite(createdEventID) ||
          createdEventID <= 0
        ) {
          throw new Error(
            'Event was created but no valid event ID was returned.',
          );
        }

        if (selectedMedia) {
          await uploadMedia(
            createdEventID,
          );
        }

        return EventsAPI.publish(
          createdEventID,
        );
      }

      const payload =
        buildPayload();

      await EventsAPI.update(
        Number(id),
        payload,
      );

      if (selectedMedia) {
        await uploadMedia(
          Number(id),
        );
      }

      return EventsAPI.publish(
        Number(id),
      );
    },

    onSuccess: () => {
      if (!isEdit) {
        toast.success(
          'Event created as draft. Open it from Events and publish it.',
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

        return;
      }

      toast.success(
        'Event published successfully',
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
        'Failed to publish event',
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

  const isSaving =
    save.isPending ||
    publish.isPending ||
    mediaUploading;

  const rawCurrentMediaURL =
    mediaPreview ||
    form.cover_media_url ||
    form.cover_image ||
    '';

  const currentMediaURL =
    mediaPreview ||
    resolveMediaUrl(rawCurrentMediaURL);

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
            disabled={isSaving}
            onClick={() => {
              save.mutate(undefined, {
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
              });
            }}
          >
            Save as draft
          </Button>

          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={() => {
              publish.mutate();
            }}
            loading={isSaving}
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

              {/* =================================================
                  MEDIA UPLOAD
              ================================================== */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Event cover
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={
                    handleMediaSelect
                  }
                  className="hidden"
                />

                <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={isSaving}
                    className="flex w-full flex-col items-center justify-center rounded-lg border border-ink-200 bg-white px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-6 w-6 text-brand-600" />

                    <span className="mt-2 text-sm font-semibold text-ink-900">
                      Choose event cover image
                    </span>

                    <span className="mt-1 text-xs text-ink-500">
                      JPG, JPEG, PNG, WEBP, GIF
                    </span>

                    <span className="mt-1 text-xs text-ink-400">
                      Maximum 100 MB
                    </span>
                  </button>

                  {selectedMedia && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <ImageIcon className="h-4 w-4 shrink-0 text-brand-600" />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {selectedMedia.name}
                          </p>

                          <p className="text-xs text-ink-500">
                            {(
                              selectedMedia.size /
                              (1024 * 1024)
                            ).toFixed(2)}{' '}
                            MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          removeSelectedMedia
                        }
                        disabled={isSaving}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {!selectedMedia &&
                    form.cover_image && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-brand-600" />

                          <span className="text-xs text-ink-600">
                            Existing cover media
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                <p className="mt-1 text-xs text-ink-500">
                  Upload directly from your laptop. The
                  backend stores it locally during development.
                </p>
              </div>
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
                placeholder="e.g. DTU Auditorium"
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
                placeholder="Street / area / building"
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
                placeholder="e.g. Delhi"
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
                placeholder="India"
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

              <Input
                label="Registration deadline"
                type="datetime-local"
                value={
                  form.registration_deadline
                }
                onChange={(e) =>
                  set(
                    'registration_deadline',
                    e.target.value,
                  )
                }
                hint="Must be before the event starts"
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
                    value={
                      form.price === 0
                        ? ''
                        : form.price
                    }
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

              <Input
                label="Max tickets per user"
                type="number"
                min="1"
                value={
                  form.max_tickets_per_user
                }
                onChange={(e) =>
                  set(
                    'max_tickets_per_user',
                    e.target.value === ''
                      ? 0
                      : Number(
                        e.target.value,
                      ),
                  )
                }
                hint="Maximum tickets one attendee can register for"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4">
              <div>
                <p className="font-semibold">
                  Allow waitlist
                </p>

                <p className="text-xs text-ink-500">
                  Let users join when the event is full.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  !!form.allow_waitlist
                }
                onChange={(e) =>
                  set(
                    'allow_waitlist',
                    e.target.checked,
                  )
                }
                className="h-4 w-4 accent-brand-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Visibility
              </label>

              <select
                value={form.visibility}
                onChange={(e) =>
                  set(
                    'visibility',
                    e.target.value,
                  )
                }
                className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="public">
                  Public
                </option>

                <option value="private">
                  Private
                </option>
              </select>

              <p className="mt-1 text-xs text-ink-500">
                Public events can be discovered by attendees.
              </p>
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
                  if (e.key === 'Enter') {
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
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand-500 to-sky-500">
              {currentMediaURL ? (
                <img
                  src={currentMediaURL}
                  alt={
                    form.title ||
                    'Event cover'
                  }
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display =
                      'none';
                  }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-white/80">
                  <ImageIcon className="h-8 w-8" />
                  <p className="mt-2 text-xs">
                    Event cover preview
                  </p>
                </div>
              )}

              {mediaUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60 text-sm font-semibold text-white">
                  Uploading media…
                </div>
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
                  ? `₹${Number(
                    form.price,
                  ).toLocaleString(
                    'en-IN',
                  )}`
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
                • Set a registration deadline
              </li>

              <li>
                • Configure ticket limit and waitlist
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