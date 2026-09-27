import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ScanLine } from 'lucide-react';
import { EventsAPI, TicketsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export function StaffTickets() {
    const qc = useQueryClient();

    const [eventId, setEventId] = useState('');
    const [q, setQ] = useState('');

    const {
        data: events,
        isLoading: eventsLoading,
    } = useQuery({
        queryKey: ['events', 'staff-tickets'],
        queryFn: () =>
            EventsAPI.list({
                status: 'published',
            }),
    });

    const {
        data: tickets,
        isLoading: ticketsLoading,
    } = useQuery({
        queryKey: ['tickets', 'staff', eventId],
        queryFn: () =>
            TicketsAPI.list({
                event_id: eventId,
            }),
        enabled: !!eventId,
    });

    const checkin = useMutation({
        mutationFn: (ticket: {
            eventId: number | string;
            code: string;
        }) =>
            TicketsAPI.checkin(
                ticket.eventId,
                ticket.code
            ),

        onSuccess: (ticket: any) => {
            qc.invalidateQueries({
                queryKey: ['tickets', 'staff', eventId],
            });

            toast.success(
                ticket?.already
                    ? 'Already checked in'
                    : 'Checked in successfully'
            );
        },

        onError: () => {
            toast.error('Unable to check in ticket');
        },
    });

    const filtered = (tickets || []).filter(
        (ticket: any) => {
            if (!q.trim()) return true;

            const search = q.toLowerCase();

            return (
                String(ticket.ticket_code || '')
                    .toLowerCase()
                    .includes(search) ||
                String(ticket.attendee_name || '')
                    .toLowerCase()
                    .includes(search) ||
                String(ticket.attendee_email || '')
                    .toLowerCase()
                    .includes(search)
            );
        }
    );

    return (
        <div className="space-y-4">
            {/* Header */}

            <div>
                <h2 className="font-display text-2xl font-semibold">
                    Tickets
                </h2>

                <p className="text-sm text-ink-500">
                    View event tickets and check attendees in.
                </p>
            </div>

            {/* Filters */}

            <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:grid-cols-[240px_1fr]">
                <select
                    value={eventId}
                    onChange={(e) =>
                        setEventId(e.target.value)
                    }
                    className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
                >
                    <option value="">
                        Pick an event…
                    </option>

                    {(events || []).map((event) => (
                        <option
                            key={event.id}
                            value={event.id}
                        >
                            {event.title}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3">
                    <Search className="h-4 w-4 text-ink-400" />

                    <input
                        value={q}
                        onChange={(e) =>
                            setQ(e.target.value)
                        }
                        placeholder="Search ticket code or attendee"
                        className="h-10 flex-1 bg-transparent text-sm outline-none"
                        disabled={!eventId}
                    />
                </div>
            </div>

            {/* Tickets */}

            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                            <tr>
                                <th className="px-4 py-3">
                                    Code
                                </th>

                                <th>Attendee</th>

                                <th>Email</th>

                                <th>Status</th>

                                <th></th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-ink-100">
                            {!eventId ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6"
                                    >
                                        <EmptyState
                                            icon={
                                                <ScanLine className="h-5 w-5" />
                                            }
                                            title="Pick an event"
                                            description="Choose an event above to load its tickets."
                                        />
                                    </td>
                                </tr>
                            ) : eventsLoading ||
                                ticketsLoading ? (
                                Array.from({
                                    length: 4,
                                }).map((_, index) => (
                                    <tr key={index}>
                                        <td
                                            colSpan={5}
                                            className="p-3"
                                        >
                                            <Skeleton className="h-8" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6"
                                    >
                                        <EmptyState
                                            title="No tickets"
                                            description="No tickets have been issued for this event."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(
                                    (ticket: any) => (
                                        <tr
                                            key={ticket.id}
                                            className="hover:bg-ink-50"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {ticket.ticket_code}
                                            </td>

                                            <td>
                                                {ticket.attendee_name ||
                                                    '—'}
                                            </td>

                                            <td className="text-xs text-ink-500">
                                                {ticket.attendee_email ||
                                                    '—'}
                                            </td>

                                            <td>
                                                <Badge
                                                    tone={
                                                        ticket.checked_in
                                                            ? 'green'
                                                            : 'gray'
                                                    }
                                                    dot
                                                >
                                                    {ticket.checked_in
                                                        ? 'Checked in'
                                                        : 'Awaiting'}
                                                </Badge>
                                            </td>

                                            <td className="pr-4">
                                                {!ticket.checked_in && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        leftIcon={
                                                            <ScanLine className="h-3.5 w-3.5" />
                                                        }
                                                        loading={
                                                            checkin.isPending
                                                        }
                                                        onClick={() =>
                                                            checkin.mutate(
                                                                {
                                                                    eventId,
                                                                    code: ticket.ticket_code,
                                                                }
                                                            )
                                                        }
                                                    >
                                                        Check in
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}