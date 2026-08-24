import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { eventsApi } from '@/api/event';
import { registrationsApi } from '@/api/registrations';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { normalizeError } from '@/api/client';
import { REGISTRATION_STATUS } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import { Select } from '@/components/ui/Select';
import { useSearchParams } from 'react-router-dom';
import type { Registration } from '@/types/registration';

export function RegistrationsPage() {
    const [params] = useSearchParams();
    const eventIdFromQuery = params.get('event') ?? '';

    const [search, setSearch] = useState('');
    const debounced = useDebounce(search, 300);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>('');
    const [eventId, setEventId] = useState<string>(eventIdFromQuery);
    const [confirmCancel, setConfirmCancel] = useState<Registration | null>(null);

    const qc = useQueryClient();
    const toast = useToast();

    const events = useQuery({
        queryKey: ['events', 'all-min'],
        queryFn: () => eventsApi.list({ page_size: 100 }),
    });

    // If we are scoped to a single event we fetch from that endpoint,
    // otherwise we aggregate via /registrations/me as a per-user view.
    const list = useQuery({
        queryKey: ['registrations', { eventId, page, search: debounced, status }],
        queryFn: () => eventId
            ? registrationsApi.forEvent(eventId, { page, search: debounced, status: status || undefined })
            : registrationsApi.mine({ page, search: debounced, status: status || undefined }),
    });

    const cancel = useMutation({
        mutationFn: (id: string) => registrationsApi.cancel(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['registrations'] });
            qc.invalidateQueries({ queryKey: ['events'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Registration cancelled');
            setConfirmCancel(null);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Registrations</h1>
                    <p className="mt-1 text-sm text-ink-500">All registrations across your events.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>List</CardTitle>
                        <CardDescription>Filter, search and manage registrations.</CardDescription>
                    </div>
                </CardHeader>

                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search name or email…"
                                className="h-9 w-full rounded border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                            />
                        </div>
                    </div>
                    <div className="w-48">
                        <Select
                            label="Event"
                            value={eventId}
                            onChange={e => { setEventId(e.target.value); setPage(1); }}
                            options={[
                                { label: 'All events', value: '' },
                                ...(events.data?.data ?? []).map(e => ({ label: e.title, value: e.id })),
                            ]}
                        />
                    </div>
                    <div className="w-40">
                        <Select
                            label="Status"
                            value={status}
                            onChange={e => { setStatus(e.target.value); setPage(1); }}
                            options={[
                                { label: 'All', value: '' },
                                ...Object.entries(REGISTRATION_STATUS).map(([k, v]) => ({ label: v.label, value: k })),
                            ]}
                        />
                    </div>
                </div>

                {list.isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : (list.data?.data?.length ?? 0) === 0 ? (
                    <EmptyState title="No registrations found" description="Try adjusting the filters." />
                ) : (
                    <div className="overflow-hidden rounded-lg border border-ink-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Attendee</th>
                                    <th className="px-4 py-2.5 font-medium">Event</th>
                                    <th className="px-4 py-2.5 font-medium">Status</th>
                                    <th className="px-4 py-2.5 font-medium">Created</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {list.data!.data.map(r => {
                                    const meta = REGISTRATION_STATUS[r.status];
                                    return (
                                        <tr key={r.id} className="hover:bg-ink-50/60">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-ink-900">{r.user?.name ?? r.user_id}</p>
                                                <p className="text-xs text-ink-500">{r.user?.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-ink-700">{r.event?.title ?? r.event_id}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge tone={meta?.tone as any ?? 'neutral'}>{meta?.label ?? r.status}</Badge>
                                                    {r.status === 'waitlisted' && r.waitlist_position != null && (
                                                        <span className="text-2xs text-ink-500">#{r.waitlist_position}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-ink-500">{fmtDateTime(r.created_at)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {r.status !== 'cancelled' && (
                                                    <Button
                                                        size="sm" variant="outline"
                                                        icon={<X className="h-4 w-4" />}
                                                        onClick={() => setConfirmCancel(r)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4">
                    <Pagination
                        page={list.data?.meta.page ?? 1}
                        totalPages={list.data?.meta.total_pages ?? 1}
                        onChange={setPage}
                    />
                </div>
            </Card>

            <ConfirmDialog
                open={!!confirmCancel}
                title="Cancel registration?"
                description={
                    confirmCancel?.status === 'waitlisted'
                        ? 'They will be removed from the waitlist.'
                        : 'Their seat will be released and offered to the next person on the waitlist.'
                }
                loading={cancel.isPending}
                onClose={() => setConfirmCancel(null)}
                onConfirm={() => confirmCancel && cancel.mutate(confirmCancel.id)}
            />
        </div>
    );
}
