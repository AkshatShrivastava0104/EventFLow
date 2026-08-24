import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TicketCard } from '@/components/tickets/TicketCard';
import { ticketsApi } from '@/api/tickets';
import { registrationsApi } from '@/api/registrations';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';
import { Ticket as TicketIcon } from 'lucide-react';

export function TicketsPage() {
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<string | null>(null);
    const [issueFor, setIssueFor] = useState<string | null>(null);
    const qc = useQueryClient();
    const toast = useToast();

    const list = useQuery({
        queryKey: ['tickets', { page }],
        queryFn: () => ticketsApi.list({ page, page_size: 12 }),
    });

    const unissued = useQuery({
        queryKey: ['registrations', 'unissued'],
        queryFn: () => registrationsApi.mine({ page_size: 50 }),
        enabled: !!issueFor,
    });

    const issue = useMutation({
        mutationFn: (registrationId: string) => ticketsApi.issue(registrationId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tickets'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Ticket issued');
            setIssueFor(null);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    const selectedTicket = useQuery({
        queryKey: ['tickets', selected],
        queryFn: () => ticketsApi.get(selected!),
        enabled: !!selected,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Tickets</h1>
                    <p className="mt-1 text-sm text-ink-500">Issue and review issued tickets.</p>
                </div>
                <Button icon={<TicketIcon className="h-4 w-4" />} onClick={() => setIssueFor('open')}>Issue ticket</Button>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Issued tickets</CardTitle>
                        <CardDescription>Click a ticket to view its QR code.</CardDescription>
                    </div>
                </CardHeader>

                {list.isLoading ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
                    </div>
                ) : (list.data?.data?.length ?? 0) === 0 ? (
                    <EmptyState title="No tickets yet" />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {list.data!.data.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelected(t.id)}
                                className="rounded-lg border border-ink-200 bg-white p-4 text-left hover:border-ink-300"
                            >
                                <p className="line-clamp-1 text-sm font-semibold text-ink-900">{t.event?.title ?? 'Event'}</p>
                                <p className="mt-1 text-xs text-ink-500">{t.attendee?.name ?? '—'}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="font-mono text-xs text-ink-700">{t.ticket_number}</span>
                                    <Badge tone="accent">View QR</Badge>
                                </div>
                            </button>
                        ))}
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

            {/* View ticket modal */}
            <Modal
                open={!!selected}
                onClose={() => setSelected(null)}
                title="Ticket"
                footer={
                    <>
                        <Button variant="outline" onClick={() => window.print()}>Print</Button>
                        <Button onClick={() => setSelected(null)}>Close</Button>
                    </>
                }
            >
                {selectedTicket.isLoading ? (
                    <Skeleton className="h-64" />
                ) : selectedTicket.data ? (
                    <TicketCard ticket={selectedTicket.data} />
                ) : (
                    <p className="text-sm text-ink-500">Ticket not found.</p>
                )}
            </Modal>

            {/* Issue ticket modal */}
            <Modal
                open={!!issueFor}
                onClose={() => setIssueFor(null)}
                title="Issue ticket"
                description="Select a registered attendee to issue a ticket for."
                size="lg"
            >
                {unissued.isLoading ? (
                    <Skeleton className="h-32" />
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {(unissued.data?.data ?? [])
                            .filter(r => r.status === 'registered')
                            .map(r => (
                                <div key={r.id} className="flex items-center justify-between border-b border-ink-100 py-2 last:border-b-0">
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">{r.user?.name ?? r.user_id}</p>
                                        <p className="text-xs text-ink-500">{r.event?.title ?? r.event_id}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        loading={issue.isPending && issue.variables === r.id}
                                        onClick={() => issue.mutate(r.id)}
                                    >Issue</Button>
                                </div>
                            ))}
                        {(unissued.data?.data ?? []).filter(r => r.status === 'registered').length === 0 && (
                            <p className="text-sm text-ink-500">No eligible registrations.</p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
