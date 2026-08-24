import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Pencil,
  QrCode,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { eventsApi } from '@/api/events';
import { registrationsApi } from '@/api/registrations';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fmtDateTime, fmtDate } from '@/lib/format';
import { registrationStatusMeta, paymentStatusMeta } from '@/lib/constants';
import type { EventLifecycleAction } from '@/types/event';
import { normalizeError } from '@/api/client';

export function OrgEventDetail() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { activeOrgId } = useOrg();

  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<null | 'cancel' | 'delete'>(null);

  const eventQ = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id),
    enabled: Number.isFinite(id),
  });
  const attendeesQ = useQuery({
    queryKey: ['event', id, 'attendees', page],
    queryFn: () => registrationsApi.forEvent(id, { page, limit: 12 }),
    enabled: Number.isFinite(id),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['event', id] }),
      qc.invalidateQueries({ queryKey: ['org', activeOrgId, 'events'] }),
    ]);

  const transition = useMutation({
    mutationFn: (action: EventLifecycleAction) => eventsApi.transition(id, action),
    onSuccess: async (_r, action) => {
      await invalidate();
      toast.success(
        action === 'publish' ? 'Event published' : action === 'complete' ? 'Event completed' : 'Event cancelled',
      );
      setConfirm(null);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const remove = useMutation({
    mutationFn: () => eventsApi.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['org', activeOrgId, 'events'] });
      toast.success('Event deleted');
      navigate('/org/events');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const event = eventQ.data;
  const status = event?.status;
  const attendees = attendeesQ.data?.attendees ?? [];
  const busy = transition.isPending;

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link
            to="/org/events"
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Events
          </Link>
        }
        title={event?.title ?? 'Event'}
        actions={
          event ? (
            <div className="flex flex-wrap items-center gap-2">
              {(status === 'published' || status === 'completed') && (
                <Link to={`/org/events/${id}/check-in`}>
                  <Button variant="outline" icon={<QrCode className="h-4 w-4" />}>
                    Check-in
                  </Button>
                </Link>
              )}
              {status !== 'cancelled' && status !== 'completed' && (
                <Link to={`/org/events/${id}/edit`}>
                  <Button variant="outline" icon={<Pencil className="h-4 w-4" />}>
                    Edit
                  </Button>
                </Link>
              )}
              {status === 'draft' && (
                <Button
                  icon={<Send className="h-4 w-4" />}
                  loading={busy}
                  onClick={() => transition.mutate('publish')}
                >
                  Publish
                </Button>
              )}
              {status === 'published' && (
                <Button
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  loading={busy}
                  onClick={() => transition.mutate('complete')}
                >
                  Mark complete
                </Button>
              )}
              {(status === 'draft' || status === 'published') && (
                <Button variant="ghost" onClick={() => setConfirm('cancel')}>
                  Cancel event
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-danger-600 hover:bg-danger-50"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirm('delete')}
              >
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />

      {eventQ.error && (
        <Alert tone="danger" className="mb-6">
          {normalizeError(eventQ.error).message}
        </Alert>
      )}

      {eventQ.isLoading || !event ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Details */}
          <div className="lg:col-span-2">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <EventStatusBadge status={event.status} />
              </div>
              {event.description ? (
                <p className="whitespace-pre-line text-sm text-ink-700">{event.description}</p>
              ) : (
                <p className="text-sm italic text-ink-400">No description provided.</p>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail icon={<CalendarClock className="h-4 w-4" />} label="Starts" value={fmtDateTime(event.start_time)} />
                <Detail icon={<CalendarClock className="h-4 w-4" />} label="Ends" value={fmtDateTime(event.end_time)} />
                <Detail icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.venue || '—'} />
                <Detail icon={<Users className="h-4 w-4" />} label="Capacity" value={event.capacity != null ? String(event.capacity) : 'Unlimited'} />
                <Detail
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Registration deadline"
                  value={fmtDateTime(event.registration_deadline)}
                />
                <Detail icon={<CalendarClock className="h-4 w-4" />} label="Created" value={fmtDate(event.created_at)} />
              </dl>
            </Card>
          </div>

          {/* Attendees summary */}
          <div>
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-500">Registered attendees</p>
                <p className="mt-1 text-3xl font-semibold text-ink-900">
                  {attendeesQ.isLoading ? '—' : attendeesQ.data?.pagination.total ?? 0}
                  {event.capacity != null && (
                    <span className="text-base font-normal text-ink-400"> / {event.capacity}</span>
                  )}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-50 text-accent-700">
                <Users className="h-5 w-5" />
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* Attendee roster */}
      {event && (
        <Card className="mt-6" padded={false}>
          <CardHeader className="p-5 pb-0">
            <CardTitle>Attendees</CardTitle>
          </CardHeader>
          <div className="p-5">
            {attendeesQ.isLoading ? (
              <Skeleton className="h-48" />
            ) : attendees.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="No registrations yet"
                description="Attendees who register will appear here."
              />
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Attendee</TH>
                      <TH>Status</TH>
                      <TH>Payment</TH>
                      <TH>Registered</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {attendees.map((a) => {
                      const s = registrationStatusMeta(a.status);
                      const p = paymentStatusMeta(a.payment_status);
                      return (
                        <TR key={a.registration_id}>
                          <TD>
                            <div className="flex items-center gap-3">
                              <Avatar name={a.name} size={32} />
                              <div className="min-w-0">
                                <p className="font-medium text-ink-900">{a.name}</p>
                                <p className="truncate text-xs text-ink-500">{a.email}</p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <Badge tone={s.tone}>{s.label}</Badge>
                          </TD>
                          <TD>
                            <Badge tone={p.tone}>{p.label}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-ink-500">{fmtDate(a.created_at)}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
                {attendeesQ.data && (
                  <Pagination
                    className="mt-4"
                    page={attendeesQ.data.pagination.page}
                    totalPages={attendeesQ.data.pagination.total_pages}
                    onChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Cancel this event?"
        description="Attendees may be notified. This cannot be undone."
        confirmText="Cancel event"
        tone="danger"
        loading={transition.isPending}
        onConfirm={() => transition.mutate('cancel')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this event?"
        description="This permanently removes the event and its data."
        confirmText="Delete"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
