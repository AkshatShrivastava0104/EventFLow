import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Download,
  Share2,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { TicketsAPI } from '../../lib/queries';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QRCode } from '../../components/shared/QRCode';
import toast from 'react-hot-toast';

export function TicketPage() {
  const { id } = useParams();

  const {
    data: ticket,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => TicketsAPI.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-10">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="p-10 text-center text-ink-500">
        <p>Ticket not found.</p>

        <Link
          to="/my-registrations"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Back to my registrations
        </Link>
      </div>
    );
  }

  const ticketData = ticket as any;

  const ticketCode =
    ticketData.qr_code ||
    ticketData.ticket_number ||
    '';

  const qrCodeUrl =
    ticketData.qr_code_url ||
    '';

  const eventTitle =
    ticketData.event_title ||
    'Event';

  const eventCategory =
    ticketData.event_category ||
    'Event';

  const eventVenue =
    ticketData.event_venue ||
    'Venue not available';

  const eventAddress =
    ticketData.event_address ||
    '';

  const eventCity =
    ticketData.event_city ||
    '';

  const eventCountry =
    ticketData.event_country ||
    '';

  const eventStart =
    ticketData.event_start ||
    '';

  const eventEnd =
    ticketData.event_end ||
    '';

  const attendeeName =
    ticketData.attendee_name ||
    'Attendee';

  const attendeeEmail =
    ticketData.attendee_email ||
    '';

  const location = [
    eventAddress,
    eventCity,
    eventCountry,
  ]
    .filter(Boolean)
    .join(', ');

  /*
   * Keep the event time exactly as stored by the backend.
   *
   * The event creation form uses datetime-local values.
   * Parsing those timestamps with the browser's local timezone
   * was causing the ticket to show +5:30 in India.
   *
   * These helpers intentionally read the UTC components so that
   * the ticket displays the same date/time entered in the form.
   */
  const formatEventDate = (value: string) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const formatEventTime = (value: string) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(date);
  };

  const startDate = formatEventDate(eventStart);
  const startTime = formatEventTime(eventStart);

  const endDate = formatEventDate(eventEnd);
  const endTime = formatEventTime(eventEnd);

  const isSameDate =
    startDate &&
    endDate &&
    startDate === endDate;

  let whenValue = 'Date not available';
  let whenSub: string | undefined;

  if (eventStart) {
    if (eventEnd) {
      if (isSameDate) {
        whenValue = startDate;
        whenSub = `${startTime} – ${endTime}`;
      } else {
        whenValue = startDate;
        whenSub = `${startTime} – ${endDate} ${endTime}`;
      }
    } else {
      whenValue = startDate;
      whenSub = startTime;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/my-registrations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All tickets
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px]">
          {/* Ticket information */}
          <div className="bg-ink-950 p-6 text-white sm:p-8">
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  ticketData.checked_in
                    ? 'green'
                    : 'blue'
                }
                dot
              >
                {ticketData.checked_in
                  ? 'Checked in'
                  : 'Valid'}
              </Badge>

              <Badge tone="gray">
                {eventCategory}
              </Badge>
            </div>

            <h1 className="font-display mt-3 text-3xl font-semibold leading-tight">
              {eventTitle}
            </h1>

            <div className="mt-6 grid gap-4 text-sm">
              <TicketRow
                icon={
                  <Calendar className="h-4 w-4" />
                }
                label="When"
                value={whenValue}
                sub={whenSub}
              />

              <TicketRow
                icon={
                  <MapPin className="h-4 w-4" />
                }
                label="Where"
                value={eventVenue}
                sub={location || undefined}
              />
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-ink-300">
              <p>ATTENDEE</p>

              <p className="mt-1 font-semibold text-white">
                {attendeeName}
              </p>

              {attendeeEmail && (
                <p>{attendeeEmail}</p>
              )}
            </div>
          </div>

          {/* QR / Ticket code */}
          <div className="relative flex flex-col items-center justify-center gap-3 border-t border-dashed border-ink-200 bg-white p-6 sm:border-l sm:border-t-0">
            <div className="absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-ink-50 sm:block" />

            <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-ink-50 sm:block" />

            {ticketCode ? (
              <>
                <QRCode
                  value={ticketCode}
                  qrCodeUrl={qrCodeUrl}
                  size={180}
                />

                <p className="max-w-[220px] break-all text-center font-mono text-sm font-semibold text-ink-900">
                  {ticketCode}
                </p>

                <p className="text-xs text-ink-500">
                  Present at entry
                </p>
              </>
            ) : (
              <>
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-ink-50">
                  <p className="text-sm font-semibold text-ink-500">
                    Ticket pending
                  </p>
                </div>

                <p className="text-xs text-ink-500">
                  Ticket code unavailable
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Info className="h-3.5 w-3.5" />
            This ticket is unique. Do not share the QR code publicly.
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <Download className="h-4 w-4" />
              }
              onClick={() =>
                toast.success(
                  'PDF download will be available soon',
                )
              }
            >
              PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <Share2 className="h-4 w-4" />
              }
              onClick={() => {
                navigator.clipboard.writeText(
                  window.location.href,
                );

                toast.success(
                  'Link copied',
                );
              }}
            >
              Share
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({
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
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">
          {label}
        </p>

        <p className="text-sm font-semibold text-white">
          {value}
        </p>

        {sub && (
          <p className="text-xs text-ink-300">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}