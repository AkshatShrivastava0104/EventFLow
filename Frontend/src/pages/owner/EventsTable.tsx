import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  PlayCircle,
  XCircle,
  CheckSquare,
  ExternalLink,
} from 'lucide-react';
import { EventsAPI } from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { fmtDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

type MenuPosition = {
  top: number;
  right: number;
};

export function EventsTable() {
  const qc = useQueryClient();
  const { role } = useAuth();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] =
    useState<MenuPosition | null>(null);

  const isAdmin = role === 'admin';

  const eventsBasePath = isAdmin
    ? '/admin/events'
    : '/dashboard/events';

  const createEventPath = `${eventsBasePath}/new`;

  const { data, isLoading } = useQuery({
    queryKey: ['events', role],
    queryFn: () => EventsAPI.list(),
  });

  const items = useMemo(() => {
    let list = data || [];

    if (status !== 'all') {
      list = list.filter(
        (e) => e.status === status,
      );
    }

    if (q) {
      const search = q.toLowerCase();

      list = list.filter((e) =>
        e.title?.toLowerCase().includes(search),
      );
    }

    return list;
  }, [data, q, status]);

  /*
   * Close action menu when user scrolls.
   * The menu itself is fixed to the viewport so it
   * never gets clipped by the table/container.
   */
  useEffect(() => {
    if (openMenu === null) {
      return;
    }

    const handleScroll = () => {
      setOpenMenu(null);
      setMenuPosition(null);
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
        true,
      );
    };
  }, [openMenu]);

  /*
   * Publish event
   */
  const publish = useMutation({
    mutationFn: (id: number) =>
      EventsAPI.publish(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['events'],
      });

      toast.success('Event published');
      setOpenMenu(null);
      setMenuPosition(null);
    },

    onError: (error: any) => {
      console.error(
        'Publish event error:',
        error,
      );

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to publish event',
      );
    },
  });

  /*
   * Cancel event
   */
  const cancel = useMutation({
    mutationFn: (id: number) =>
      EventsAPI.cancel(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['events'],
      });

      toast.success('Event cancelled');
      setOpenMenu(null);
      setMenuPosition(null);
    },

    onError: (error: any) => {
      console.error(
        'Cancel event error:',
        error,
      );

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to cancel event',
      );
    },
  });

  /*
   * Complete event
   */
  const complete = useMutation({
    mutationFn: (id: number) =>
      EventsAPI.complete(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['events'],
      });

      toast.success(
        'Event marked as completed',
      );

      setOpenMenu(null);
      setMenuPosition(null);
    },

    onError: (error: any) => {
      console.error(
        'Complete event error:',
        error,
      );

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to complete event',
      );
    },
  });

  /*
   * Delete event
   */
  const remove = useMutation({
    mutationFn: (id: number) =>
      EventsAPI.remove(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['events'],
      });

      toast.success('Event deleted');

      setOpenMenu(null);
      setMenuPosition(null);
    },

    onError: (error: any) => {
      console.error(
        'Delete event error:',
        error,
      );

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to delete event',
      );
    },
  });

  const handleCopyLink = async (
    id: number,
  ) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/events/${id}`,
      );

      toast.success('Link copied');

      setOpenMenu(null);
      setMenuPosition(null);
    } catch (error) {
      console.error(
        'Copy link error:',
        error,
      );

      toast.error('Failed to copy link');
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this event?')) {
      remove.mutate(id);
    }
  };

  /*
   * Production-style action menu positioning.
   *
   * If there isn't enough room below the three-dot button,
   * the menu opens ABOVE the button automatically.
   *
   * Fixed positioning also prevents the menu from being
   * clipped by table/container overflow.
   */
  const handleMenuToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: number,
  ) => {
    if (openMenu === id) {
      setOpenMenu(null);
      setMenuPosition(null);
      return;
    }

    const buttonRect =
      event.currentTarget.getBoundingClientRect();

    const MENU_WIDTH = 208;
    const MENU_HEIGHT = 390;
    const VIEWPORT_PADDING = 8;

    const spaceBelow =
      window.innerHeight - buttonRect.bottom;

    const shouldOpenAbove =
      spaceBelow < MENU_HEIGHT;

    let top = shouldOpenAbove
      ? buttonRect.top - MENU_HEIGHT
      : buttonRect.bottom;

    top = Math.max(
      VIEWPORT_PADDING,
      Math.min(
        top,
        window.innerHeight -
        MENU_HEIGHT -
        VIEWPORT_PADDING,
      ),
    );

    const right = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth -
      buttonRect.right,
    );

    setMenuPosition({
      top,
      right,
    });

    setOpenMenu(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Events
          </h2>

          <p className="text-sm text-ink-500">
            Manage all events across your organization.
          </p>
        </div>

        <Link to={createEventPath}>
          <Button
            variant="secondary"
            leftIcon={
              <Plus className="h-4 w-4" />
            }
          >
            Create event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3">
          <Search className="h-4 w-4 text-ink-400" />

          <input
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
            placeholder="Search events"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
          {[
            'all',
            'published',
            'draft',
            'cancelled',
            'completed',
          ].map((s) => (
            <button
              key={s}
              onClick={() =>
                setStatus(s)
              }
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${status === s
                  ? 'bg-white text-ink-900 shadow-sm'
                  : 'text-ink-500'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">
                  Event
                </th>
                <th>When</th>
                <th>Category</th>
                <th>Price</th>
                <th>Reg / Cap</th>
                <th>Revenue</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {/* Loading */}
              {isLoading &&
                Array.from({
                  length: 5,
                }).map((_, i) => (
                  <tr key={i}>
                    <td
                      colSpan={8}
                      className="p-3"
                    >
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))}

              {/* Empty */}
              {!isLoading &&
                items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6"
                    >
                      <EmptyState
                        title="No events yet"
                        description="Create your first event to see it here."
                        action={
                          <Link
                            to={
                              createEventPath
                            }
                          >
                            <Button variant="secondary">
                              Create event
                            </Button>
                          </Link>
                        }
                      />
                    </td>
                  </tr>
                )}

              {/* Events */}
              {!isLoading &&
                items.map((e) => {
                  const price =
                    Number(e.price) || 0;

                  const registered =
                    Number(
                      e.registered_count,
                    ) || 0;

                  const capacity =
                    Number(e.capacity) || 0;

                  const revenue =
                    price * registered;

                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-ink-50"
                    >
                      {/* Event */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500" />

                          <div>
                            <div className="font-semibold text-ink-900">
                              {e.title}
                            </div>

                            <div className="text-xs text-ink-500">
                              {e.venue}
                              {e.city
                                ? `, ${e.city}`
                                : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td>
                        {fmtDate(
                          e.start_at,
                          'MMM d, yyyy',
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        {e.category || '—'}
                      </td>

                      {/* Price */}
                      <td>
                        <span className="font-medium text-ink-900">
                          {price > 0
                            ? `₹${price.toLocaleString(
                              'en-IN',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}`
                            : 'Free'}
                        </span>
                      </td>

                      {/* Registration / Capacity */}
                      <td>
                        <div className="font-semibold">
                          {registered}/
                          {capacity}
                        </div>

                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full bg-brand-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (registered /
                                  Math.max(
                                    1,
                                    capacity,
                                  )) *
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Revenue */}
                      <td>
                        <span className="font-medium text-ink-900">
                          ₹
                          {revenue.toLocaleString(
                            'en-IN',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <Badge
                          tone={
                            e.status ===
                              'published'
                              ? 'green'
                              : e.status ===
                                'draft'
                                ? 'gray'
                                : e.status ===
                                  'cancelled'
                                  ? 'red'
                                  : 'blue'
                          }
                        >
                          {e.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="pr-4">
                        <button
                          type="button"
                          onClick={(event) =>
                            handleMenuToggle(
                              event,
                              e.id,
                            )
                          }
                          className="rounded-md p-1 hover:bg-ink-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed action menu */}
      {openMenu !== null &&
        menuPosition &&
        (() => {
          const event = items.find(
            (item) =>
              item.id === openMenu,
          );

          if (!event) {
            return null;
          }

          const e = event;

          return (
            <div
              className="fixed z-[100] w-52 rounded-xl border border-ink-100 bg-white p-1 shadow-2xl ring-1 ring-black/5"
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              onMouseLeave={() => {
                setOpenMenu(null);
                setMenuPosition(null);
              }}
            >
              {/* Public page */}
              <Link
                to={`/events/${e.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-100"
                onClick={() => {
                  setOpenMenu(null);
                  setMenuPosition(null);
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View public page
              </Link>

              {/* Edit */}
              <Link
                to={`${eventsBasePath}/${e.id}/edit`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-100"
                onClick={() => {
                  setOpenMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Link>

              {/* Copy */}
              <button
                type="button"
                onClick={() =>
                  handleCopyLink(e.id)
                }
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-100"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>

              <div className="my-1 border-t border-ink-100" />

              {/* Publish */}
              {e.status !==
                'published' && (
                  <button
                    type="button"
                    disabled={
                      publish.isPending
                    }
                    onClick={() =>
                      publish.mutate(e.id)
                    }
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4" />

                    {publish.isPending
                      ? 'Publishing...'
                      : 'Publish'}
                  </button>
                )}

              {/* Cancel */}
              {e.status ===
                'published' && (
                  <button
                    type="button"
                    disabled={
                      cancel.isPending
                    }
                    onClick={() =>
                      cancel.mutate(e.id)
                    }
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />

                    {cancel.isPending
                      ? 'Cancelling...'
                      : 'Cancel'}
                  </button>
                )}

              {/* Complete */}
              {e.status !==
                'completed' && (
                  <button
                    type="button"
                    disabled={
                      complete.isPending
                    }
                    onClick={() =>
                      complete.mutate(e.id)
                    }
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckSquare className="h-4 w-4" />

                    {complete.isPending
                      ? 'Completing...'
                      : 'Mark complete'}
                  </button>
                )}

              {/* Delete */}
              <button
                type="button"
                disabled={
                  remove.isPending
                }
                onClick={() =>
                  handleDelete(e.id)
                }
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />

                {remove.isPending
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            </div>
          );
        })()}
    </div>
  );
}