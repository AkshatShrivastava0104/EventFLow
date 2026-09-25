import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';

import { EventsAPI, TicketsAPI } from '../../lib/queries';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export function StaffAttendees() {
    const [eventId, setEventId] = useState('');
    const [q, setQ] = useState('');

    const { data: events, isLoading: eventsLoading } = useQuery({
        queryKey: ['events', 'staff-attendees'],
        queryFn: () => EventsAPI.list({ status: 'published' }),
    });

    const { data: tickets, isLoading: ticketsLoading } = useQuery({
        queryKey: ['tickets', 'staff-attendees', eventId],
        queryFn: () => TicketsAPI.list({ event_id: eventId }),
        enabled: !!eventId,
    });

    const attendees = useMemo(() => {
        const map = new Map<string, any>();

        (tickets || []).forEach((ticket: any) => {
            const email = String(
                ticket.attendee_email ||
                ticket.registration?.user?.email ||
                ticket.registration?.email ||
                '',
            ).toLowerCase();

            const name =
                ticket.attendee_name ||
                ticket.registration?.user?.name ||
                ticket.registration?.name ||
                'Unknown attendee';

            const key = email || `${name}-${ticket.id}`;

            if (!map.has(key)) {
                map.set(key, {
                    name,
                    email,
                    tickets: 0,
                    checkedIn: 0,
                    ticketCodes: [],
                });
            }

            const attendee = map.get(key);

            attendee.tickets += 1;

            if (
                ticket.checked_in === true ||
                ticket.status === 'checked_in' ||
                ticket.check_in_status === 'checked_in'
            ) {
                attendee.checkedIn += 1;
            }

            if (ticket.ticket_code) {
                attendee.ticketCodes.push(ticket.ticket_code);
            }
        });

        return Array.from(map.values());
    }, [tickets]);

    const filteredAttendees = attendees.filter((attendee) => {
        const search = q.trim().toLowerCase();

        if (!search) return true;

        return (
            attendee.name.toLowerCase().includes(search) ||
            attendee.email.toLowerCase().includes(search)
        );
    });

    if (eventsLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-ink-900">
                    Attendees
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                    View attendees and ticket check-in status for your events.
                </p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 md:flex-row">
                <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-sky-500"
                >
                    <option value="">Select an event</option>

                    {(events || []).map((event: any) => (
                        <option key={event.id} value={event.id}>
                            {event.title}
                        </option>
                    ))}
                </select>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        disabled={!eventId}
                        placeholder="Search attendee by name or email..."
                        className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-ink-400 focus:border-sky-500 disabled:bg-ink-50"
                    />
                </div>
            </div>

            {!eventId ? (
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="Select an event"
                    description="Choose an event to view its attendees."
                />
            ) : ticketsLoading ? (
                <div className="rounded-xl border border-ink-100 bg-white p-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="mt-6 space-y-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                </div>
            ) : filteredAttendees.length === 0 ? (
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No attendees found"
                    description={
                        q
                            ? 'Try changing your search.'
                            : 'There are no attendees for this event yet.'
                    }
                />
            ) : (
                <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-ink-100 bg-ink-50">
                                <tr>
                                    <th className="px-5 py-3 font-medium text-ink-600">
                                        Attendee
                                    </th>
                                    <th className="px-5 py-3 font-medium text-ink-600">
                                        Tickets
                                    </th>
                                    <th className="px-5 py-3 font-medium text-ink-600">
                                        Check-in
                                    </th>
                                    <th className="px-5 py-3 font-medium text-ink-600">
                                        Ticket Codes
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-ink-100">
                                {filteredAttendees.map((attendee) => (
                                    <tr
                                        key={`${attendee.email}-${attendee.name}`}
                                        className="hover:bg-ink-50/50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-ink-900">
                                                {attendee.name}
                                            </div>

                                            <div className="mt-0.5 text-xs text-ink-500">
                                                {attendee.email || 'Email unavailable'}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <Badge>{attendee.tickets}</Badge>
                                        </td>

                                        <td className="px-5 py-4">
                                            <Badge
                                                variant={
                                                    attendee.checkedIn === attendee.tickets
                                                        ? 'success'
                                                        : attendee.checkedIn > 0
                                                            ? 'warning'
                                                            : 'neutral'
                                                }
                                            >
                                                {attendee.checkedIn}/{attendee.tickets} checked in
                                            </Badge>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {attendee.ticketCodes.map((code: string) => (
                                                    <span
                                                        key={code}
                                                        className="rounded-md bg-ink-100 px-2 py-1 font-mono text-xs text-ink-600"
                                                    >
                                                        {code}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}