import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    Share2,
    Heart,
    ArrowLeft,
    Ticket as TicketIcon,
    ShieldCheck,
    ChevronRight,
    CheckCircle2,
} from 'lucide-react';
import {
    EventsAPI,
    RegistrationsAPI,
    TicketsAPI,
} from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    fmtDate,
    fmtTime,
    fmtMoney,
    eventStatusLabel,
} from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const GRAD = [
    'from-emerald-500 via-teal-500 to-cyan-600',
    'from-orange-500 via-rose-500 to-pink-600',
    'from-violet-600 via-fuchsia-500 to-pink-500',
    'from-sky-500 via-indigo-500 to-purple-600',
];

export function EventDetailsAdmin() {
    const { id } = useParams();
    const nav = useNavigate();

    const {
        data: event,
        isLoading: eventLoading,
    } = useQuery({
        queryKey: ['event', id],
        queryFn: () => EventsAPI.get(id!),
        enabled: !!id,
    });

    /*
     * Fetch the current user's registrations.
     *
     * This is required because the event API may not yet
     * return is_registered / registration_status.
     *
     * A cancelled registration is intentionally NOT treated
     * as an active registration.
     */
    const {
        data: registrations,
        isLoading: registrationsLoading,
    } = useQuery({
        queryKey: ['my-registrations'],
        queryFn: () => RegistrationsAPI.list(),
        enabled: !!id,

        /*
         * Registration state must never be stale on the
         * event details page.
         *
         * After a successful RSVP, when the user comes
         * back to this page, always fetch the latest
         * registration state from the backend.
         */
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        staleTime: 0,
    });

    const activeRegistration = registrations?.find((registration: any) => {
        const registrationEventId = Number(registration?.event_id ?? registration?.eventId ?? registration?.event?.id ?? 0);
        const registrationStatus = String(registration?.status ?? '').toLowerCase();
        return registrationEventId === Number(event?.id ?? 0) && (registrationStatus === 'registered' || registrationStatus === 'confirmed');
    });

    const isRegistered =
        event?.is_registered === true ||
        event?.registration_status === 'registered'
    !!activeRegistration;

    const { data: registrationTickets, isLoading: ticketsLoading } = useQuery({
        queryKey: ['tickets', 'event-registration', activeRegistration?.id],
        queryFn: () => TicketsAPI.list({ registration_id: activeRegistration!.id }),
        enabled: !!activeRegistration?.id,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const activeTicket = registrationTickets?.[0];

    if (eventLoading || registrationsLoading || ticketsLoading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <Skeleton className="h-96 w-full" />
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!event) {
        return <div className="p-10 text-center text-ink-500">Event not found.</div>;
    }

    const gradient = GRAD[event.id % GRAD.length];
    const status = eventStatusLabel(event.status, event.start_at, event.end_at);
    const soldOut = event.capacity > 0 && event.registered_count >= event.capacity;
    const mediaUrl = resolveMediaUrl(event.cover_image || (event as any).cover_media_url);

    const share = () => {
        navigator.clipboard.writeText(
            window.location.href,
        );

        toast.success('Event link copied');
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <button
                onClick={() => nav(-1)}
                className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            <motion.div
                initial={{
                    opacity: 0,
                    y: 8,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                className={`relative aspect-[21/9] overflow-hidden rounded-3xl bg-gradient-to-br ${gradient}`}
            >
                {mediaUrl ? (
                    <img
                        src={mediaUrl}
                        alt={event.title}
                        className="h-full w-full object-cover"
                    />
                ) : null}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/20" />

                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            tone={status.tone as any}
                            dot
                        >
                            {status.label}
                        </Badge>

                        <Badge tone="gray">
                            {event.category}
                        </Badge>

                        {event.tags
                            ?.slice(0, 3)
                            .map((t) => (
                                <Badge
                                    key={t}
                                    tone="gray"
                                >
                                    #{t}
                                </Badge>
                            ))}
                    </div>

                    <h1 className="font-display mt-3 max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">
                        {event.title}
                    </h1>
                </div>
            </motion.div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
                <div>
                    <div className="rounded-2xl border border-ink-200 bg-white p-6">
                        <h2 className="font-display text-xl font-semibold">
                            About this event
                        </h2>

                        <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-700">
                            {event.description}
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <InfoTile
                            icon={
                                <Calendar className="h-5 w-5" />
                            }
                            label="Date"
                            value={fmtDate(event.start_at)}
                            sub={`${fmtTime(
                                event.start_at,
                            )} – ${fmtTime(event.end_at)}`}
                        />

                        <InfoTile
                            icon={
                                <MapPin className="h-5 w-5" />
                            }
                            label="Venue"
                            value={event.venue}
                            sub={`${event.address}, ${event.city}${event.country
                                ? ', ' + event.country
                                : ''
                                }`}
                        />

                        <InfoTile
                            icon={
                                <Users className="h-5 w-5" />
                            }
                            label="Capacity"
                            value={
                                event.capacity > 0
                                    ? `${event.registered_count} / ${event.capacity} attending`
                                    : `${event.registered_count} attending`
                            }
                            sub={
                                event.capacity > 0
                                    ? `${Math.max(
                                        0,
                                        event.capacity -
                                        event.registered_count,
                                    )} spots left`
                                    : 'Unlimited capacity'
                            }
                        />

                        <InfoTile
                            icon={
                                <Clock className="h-5 w-5" />
                            }
                            label="Duration"
                            value={durationLabel(
                                event.start_at,
                                event.end_at,
                            )}
                            sub={fmtDate(
                                event.start_at,
                                'MMM d',
                            )}
                        />
                    </div>

                    <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-6">
                        <h3 className="font-display text-lg font-semibold">
                            What to expect
                        </h3>

                        <ul className="mt-3 grid gap-3 text-sm text-ink-700 sm:grid-cols-2">
                            <li className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                                Digital QR ticket generated immediately after RSVP
                            </li>

                            <li className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                                Show your ticket QR code at check-in
                            </li>

                            <li className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                                Cancel your registration while registration is open
                            </li>

                            <li className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                                Your ticket becomes invalid after cancellation
                            </li>
                        </ul>
                    </div>
                </div>

                <aside className="h-fit space-y-4 lg:sticky lg:top-20">
                    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                        <div className="border-b border-ink-100 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                {event.price > 0
                                    ? 'Ticket price'
                                    : 'Free event'}
                            </p>

                            <p className="font-display mt-1 text-3xl font-semibold">
                                {event.price > 0
                                    ? fmtMoney(
                                        event.price,
                                        event.currency ||
                                        'INR',
                                    )
                                    : 'Free'}
                            </p>

                            <p className="mt-1 text-xs text-ink-500">
                                {event.price > 0
                                    ? 'Payment will be available soon'
                                    : 'RSVP required'}
                            </p>
                        </div>

                        <div className="space-y-3 p-5">
                            {isRegistered ? (
                                <>
                                    <Button
                                        full
                                        size="lg"
                                        disabled
                                        leftIcon={
                                            <CheckCircle2 className="h-4 w-4" />
                                        }
                                    >
                                        Registered
                                    </Button>

                                    <p className="text-center text-xs text-ink-500">
                                        You are already registered
                                        for this event. Your ticket
                                        has been generated.
                                    </p>

                                    {activeTicket?.id ? (
                                        <Link
                                            to={`/tickets/${activeTicket.id}`}
                                        >
                                            <Button
                                                variant="outline"
                                                full
                                            >
                                                View my ticket
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            full
                                            disabled
                                        >
                                            Ticket unavailable
                                        </Button>
                                    )}
                                </>
                            ) : soldOut ? (
                                <>
                                    <Button
                                        variant="outline"
                                        full
                                        onClick={() =>
                                            nav(
                                                `/events/${event.id}/register?waitlist=1`,
                                            )
                                        }
                                    >
                                        Join waitlist
                                    </Button>

                                    <p className="text-center text-xs text-ink-500">
                                        Event is at capacity.
                                        We'll notify you if a
                                        spot opens.
                                    </p>
                                </>
                            ) : event.status !==
                                'published' ? (
                                <Button full disabled>
                                    {event.status ===
                                        'cancelled'
                                        ? 'Cancelled'
                                        : 'Not on sale'}
                                </Button>
                            ) : (
                                <Link
                                    to={`/events/${event.id}/register`}
                                >
                                    <Button
                                        full
                                        size="lg"
                                        variant="secondary"
                                        leftIcon={
                                            <TicketIcon className="h-4 w-4" />
                                        }
                                    >
                                        {event.price > 0
                                            ? 'Get tickets'
                                            : 'RSVP now'}
                                    </Button>
                                </Link>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    full
                                    leftIcon={
                                        <Share2 className="h-4 w-4" />
                                    }
                                    onClick={share}
                                >
                                    Share
                                </Button>

                                <Button
                                    variant="outline"
                                    full
                                    leftIcon={
                                        <Heart className="h-4 w-4" />
                                    }
                                    onClick={() =>
                                        toast.success(
                                            'Saved to your favorites',
                                        )
                                    }
                                >
                                    Save
                                </Button>
                            </div>

                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
                                <ShieldCheck className="h-4 w-4 text-brand-600" />

                                Secure event registration.
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-ink-200 bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                            Organizer
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 font-bold text-white">
                                EF
                            </div>

                            <div>
                                <p className="font-semibold text-ink-900">
                                    {event.organizer_name ||
                                        'EventFlow Studios'}
                                </p>

                                <p className="text-xs text-ink-500">
                                    Verified organizer
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function InfoTile({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {icon}
            </div>

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                    {label}
                </p>

                <p className="text-sm font-semibold text-ink-900">
                    {value}
                </p>

                {sub && (
                    <p className="text-xs text-ink-500">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

function durationLabel(
    a: string,
    b: string,
) {
    const ms =
        new Date(b).getTime() -
        new Date(a).getTime();

    const h = Math.floor(ms / 36e5);

    if (h < 1) return '<1 hour';

    if (h < 24) {
        return `${h} hour${h > 1 ? 's' : ''}`;
    }

    const d = Math.floor(h / 24);

    return `${d} day${d > 1 ? 's' : ''}`;
}