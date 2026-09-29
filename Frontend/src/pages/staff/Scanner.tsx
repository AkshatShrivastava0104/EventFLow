import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Ticket as TicketIcon,
  User,
  Zap,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import {
  EventsAPI,
  OrgsAPI,
  TicketsAPI,
} from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scanner,
  type IDetectedBarcode,
} from '@yudiel/react-qr-scanner';

const EVENTFLOW_QR_PREFIX = 'eventflow:ticket:';

function extractScannedTicketCode(
  value: string,
): string | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (
    !normalized
      .toLowerCase()
      .startsWith(
        EVENTFLOW_QR_PREFIX,
      )
  ) {
    return null;
  }

  const ticketCode = normalized
    .slice(EVENTFLOW_QR_PREFIX.length)
    .trim();

  return ticketCode || null;
}

function normalizeManualTicketCode(
  value: string,
): string {
  const normalized = value.trim();

  if (
    normalized
      .toLowerCase()
      .startsWith(
        EVENTFLOW_QR_PREFIX,
      )
  ) {
    return normalized
      .slice(EVENTFLOW_QR_PREFIX.length)
      .trim();
  }

  return normalized;
}

export function ScannerPage() {
  const [params] = useSearchParams();

  const eventId = params.get('event_id') || '';

  const [code, setCode] = useState('');
  const [history, setHistory] = useState<any[]>(
    [],
  );
  const [scannerPaused, setScannerPaused] =
    useState(false);
  const [cameraError, setCameraError] =
    useState<string | null>(null);

  const lastScannedRef = useRef<{
    code: string;
    at: number;
  }>({
    code: '',
    at: 0,
  });

  const { data: organizations = [] } =
    useQuery({
      queryKey: [
        'organizations',
        'scanner',
      ],
      queryFn: () => OrgsAPI.list(),
    });

  const organization = organizations[0];

  const { data: events = [] } =
    useQuery({
      queryKey: [
        'events',
        'scanner',
        organization?.id,
      ],
      queryFn: () =>
        EventsAPI.listByOrganization(
          organization!.id,
          {
            page: 1,
            limit: 100,
          },
        ),
      enabled: !!organization?.id,
    });

  const activeEvent = eventId
    ? events.find(
      (event) =>
        String(event.id) === eventId,
    )
    : null;

  const checkin = useMutation({
    mutationFn: (ticketCode: string) => {
      if (!eventId) {
        throw new Error(
          'Please select an event before checking in',
        );
      }

      return TicketsAPI.checkin(
        eventId,
        ticketCode,
      );
    },

    onSuccess: (ticket: any) => {
      setHistory((history) =>
        [
          {
            ...ticket,
            at: new Date().toISOString(),
          },
          ...history,
        ].slice(0, 15),
      );

      toast.success(
        ticket?.already
          ? 'Already checked in'
          : `✓ ${ticket?.attendee_name ||
          'Attendee'
          } checked in`,
      );

      setCode('');
    },

    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Invalid ticket';

      toast.error(message);
    },

    onSettled: () => {
      setScannerPaused(false);
    },
  });

  useEffect(() => {
    const el =
      document.getElementById(
        'scan-input',
      ) as HTMLInputElement | null;

    el?.focus();
  }, []);

  const submitTicketCode = (
    ticketCode: string,
  ) => {
    if (!eventId) {
      toast.error(
        'Select an event before checking in',
      );
      return;
    }

    const normalized =
      normalizeManualTicketCode(
        ticketCode,
      );

    if (!normalized) {
      toast.error(
        'Please enter a valid ticket code',
      );
      return;
    }

    if (checkin.isPending) {
      return;
    }

    setScannerPaused(true);
    checkin.mutate(normalized);
  };

  const handleQRScan = (
    detectedCodes: IDetectedBarcode[],
  ) => {
    if (
      !eventId ||
      scannerPaused ||
      checkin.isPending
    ) {
      return;
    }

    const rawValue =
      detectedCodes[0]?.rawValue?.trim();

    if (!rawValue) {
      return;
    }

    const ticketCode =
      extractScannedTicketCode(
        rawValue,
      );

    /*
     * EventFlow QR codes always have:
     *
     * eventflow:ticket:<ticket-number>
     *
     * Do not send arbitrary QR payloads
     * to the check-in API.
     */
    if (!ticketCode) {
      toast.error(
        'This is not a valid EventFlow ticket QR.',
      );

      return;
    }

    /*
     * Prevent the same camera frame from
     * triggering the mutation multiple times.
     */
    const now = Date.now();

    if (
      lastScannedRef.current.code ===
      ticketCode &&
      now -
      lastScannedRef.current.at <
      1500
    ) {
      return;
    }

    lastScannedRef.current = {
      code: ticketCode,
      at: now,
    };

    setCode(ticketCode);
    setScannerPaused(true);
    checkin.mutate(ticketCode);
  };

  const handleCameraError = (
    error: any,
  ) => {
    const message =
      error?.message ||
      'Unable to access the camera.';

    setCameraError(message);

    if (
      error?.kind ===
      'permission-denied'
    ) {
      toast.error(
        'Camera permission was denied. Allow camera access and try again.',
      );
      return;
    }

    if (
      error?.kind ===
      'no-camera'
    ) {
      toast.error(
        'No camera was found on this device.',
      );
      return;
    }

    if (
      error?.kind ===
      'insecure-context'
    ) {
      toast.error(
        'Camera requires HTTPS or localhost.',
      );
    }
  };

  const scan = (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!eventId) {
      toast.error(
        'Select an event before checking in',
      );
      return;
    }

    if (code.trim()) {
      submitTicketCode(code);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Check-in scanner
          </h2>

          <p className="text-sm text-ink-500">
            Scan the attendee's EventFlow QR
            ticket using your camera, or enter
            the ticket code manually.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-5 text-white sm:p-8">
          <div className="absolute inset-0 bg-grid-dark opacity-20" />

          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/40 blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-brand-400" />

                <div>
                  <p className="text-sm font-semibold">
                    Camera scanner
                  </p>

                  <p className="text-xs text-ink-400">
                    {scannerPaused
                      ? 'Processing scan…'
                      : 'Point the camera at the QR code'}
                  </p>
                </div>
              </div>

              {activeEvent && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-ink-200">
                  {activeEvent.title}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              {!eventId ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                  <ScanLine className="h-16 w-16 text-white/30" />

                  <p className="mt-4 text-sm font-semibold">
                    Select an event first
                  </p>

                  <p className="mt-1 max-w-sm text-xs text-white/50">
                    The scanner needs an event so
                    the backend can verify that the
                    ticket belongs to this event.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <Scanner
                    onScan={
                      handleQRScan
                    }
                    onError={
                      handleCameraError
                    }
                    paused={
                      scannerPaused ||
                      checkin.isPending
                    }
                    formats={[
                      'qr_code',
                    ]}
                    constraints={{
                      facingMode:
                        'environment',
                      aspectRatio: 1,
                      width: {
                        ideal: 1920,
                      },
                      height: {
                        ideal: 1080,
                      },
                    }}
                    components={{
                      onOff: true,
                      torch: true,
                      zoom: true,
                      finder: true,
                    }}
                    sound={true}
                    allowMultiple={false}
                    scanDelay={500}
                    retryDelay={100}
                    styles={{
                      container: {
                        width: '100%',
                        aspectRatio: '1 / 1',
                        background:
                          '#000000',
                      },
                      video: {
                        width: '100%',
                        height: '100%',
                        objectFit:
                          'cover',
                      },
                    }}
                  />

                  {checkin.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="rounded-2xl bg-white px-5 py-4 text-center text-ink-900 shadow-xl">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-brand-500" />

                        <p className="mt-3 text-sm font-semibold">
                          Verifying ticket…
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {cameraError && eventId && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
                <div className="flex gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Camera unavailable
                    </p>

                    <p className="mt-1 text-red-200/80">
                      {cameraError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={scan}
              className="mt-5 flex w-full gap-2"
            >
              <input
                id="scan-input"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value,
                  )
                }
                placeholder="Enter ticket code manually…"
                disabled={
                  !eventId ||
                  checkin.isPending
                }
                className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-sm text-white placeholder:text-white/40 outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <Button
                type="submit"
                size="lg"
                variant="secondary"
                leftIcon={
                  <Zap className="h-4 w-4" />
                }
                loading={
                  checkin.isPending
                }
                disabled={!eventId}
              >
                Check in
              </Button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-400/10 bg-brand-400/5 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />

              <p className="text-xs leading-relaxed text-ink-300">
                Only EventFlow ticket QR codes
                are accepted. The backend
                validates the ticket against the
                selected event before completing
                check-in.
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-ink-300">
              {activeEvent
                ? `Currently checking in — ${activeEvent.title}`
                : 'Select an event to start checking in'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h3 className="font-display text-lg font-semibold">
            Recent activity
          </h3>

          <div className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {history.length === 0 && (
                <p className="text-sm text-ink-500">
                  Scans will show up here in
                  real time.
                </p>
              )}

              {history.map((item) => (
                <motion.div
                  key={`${item.id}-${item.at}`}
                  initial={{
                    opacity: 0,
                    x: -10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 p-3"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.already
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-brand-100 text-brand-600'
                      }`}
                  >
                    {item.already ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {item.attendee_name ||
                        item.registration
                          ?.user_name ||
                        'Ticket'}
                    </p>

                    <p className="text-xs text-ink-500">
                      {item.event?.title ||
                        activeEvent?.title ||
                        'Event'}{' '}
                      •{' '}
                      <span className="font-mono">
                        {item.ticket_code ||
                          item.ticket_number ||
                          code}
                      </span>
                    </p>
                  </div>

                  <span className="text-[11px] text-ink-400">
                    {new Date(
                      item.at,
                    ).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Today's stats
          </p>

          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <Stat
              label="Scanned"
              value={history.length}
            />

            <Stat
              label="New"
              value={
                history.filter(
                  (item) =>
                    !item.already,
                ).length
              }
            />

            <Stat
              label="Repeats"
              value={
                history.filter(
                  (item) =>
                    item.already,
                ).length
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Scanner tips
          </p>

          <ul className="mt-2 space-y-2 text-sm text-ink-600">
            <li className="flex items-start gap-2">
              <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />

              <span>
                Point the rear camera at the
                attendee's EventFlow QR code.
              </span>
            </li>

            <li className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />

              <span>
                Verify the attendee name matches
                their ID when required.
              </span>
            </li>

            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />

              <span>
                The ticket is validated against
                the selected event.
              </span>
            </li>

            <li className="flex items-start gap-2">
              <TicketIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />

              <span>
                If the camera fails, enter the
                ticket number manually below it.
              </span>
            </li>
          </ul>
        </div>

        {activeEvent && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Active event
            </p>

            <p className="mt-2 font-display text-lg font-semibold text-ink-900">
              {activeEvent.title}
            </p>

            <p className="mt-1 text-sm text-ink-600">
              All scanned tickets are checked
              against this event.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="font-display text-2xl font-semibold">
        {value}
      </p>

      <p className="text-xs text-ink-500">
        {label}
      </p>
    </div>
  );
}