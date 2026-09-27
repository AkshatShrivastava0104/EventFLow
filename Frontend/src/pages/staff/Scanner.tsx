import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Ticket as TicketIcon,
  User,
  Zap,
} from 'lucide-react';
import {
  EventsAPI,
  OrgsAPI,
  TicketsAPI,
} from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function ScannerPage() {
  const [params] = useSearchParams();

  const eventId = params.get('event_id') || '';

  const [code, setCode] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', 'scanner'],
    queryFn: () => OrgsAPI.list(),
  });

  const organization = organizations[0];

  const { data: events = [] } = useQuery({
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
        }
      ),
    enabled: !!organization?.id,
  });

  const activeEvent = eventId
    ? events.find(
      (event) => String(event.id) === eventId
    )
    : null;

  const checkin = useMutation({
    mutationFn: (ticketCode: string) => {
      if (!eventId) {
        throw new Error(
          'Please select an event before checking in'
        );
      }

      return TicketsAPI.checkin(
        eventId,
        ticketCode
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
        ].slice(0, 15)
      );

      toast.success(
        ticket?.already
          ? 'Already checked in'
          : `✓ ${ticket?.attendee_name || 'Attendee'
          } checked in`
      );

      setCode('');
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error?.message ||
        'Invalid ticket'
      );
    },
  });

  useEffect(() => {
    const el =
      document.getElementById('scan-input');

    el?.focus();
  }, []);

  const scan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventId) {
      toast.error(
        'Select an event before checking in'
      );
      return;
    }

    if (code.trim()) {
      checkin.mutate(code.trim());
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
            Scan a QR code or enter the ticket code
            below. Focus stays in the input for
            continuous scanning.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-8 text-white">
          <div className="absolute inset-0 bg-grid-dark opacity-20" />

          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/40 blur-3xl" />

          <div className="relative flex flex-col items-center justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-2xl border-2 border-dashed border-white/30">
              <motion.div
                initial={{ y: -80 }}
                animate={{ y: 80 }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'reverse',
                  duration: 1.6,
                  ease: 'easeInOut',
                }}
                className="absolute inset-x-4 h-1 rounded-full bg-brand-400 shadow-[0_0_18px_2px_rgba(52,204,153,0.6)]"
              />

              <ScanLine className="h-20 w-20 text-white/30" />
            </div>

            <form
              onSubmit={scan}
              className="mt-6 flex w-full max-w-md gap-2"
            >
              <input
                id="scan-input"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value)
                }
                placeholder="Paste or type ticket code…"
                disabled={
                  !eventId ||
                  checkin.isPending
                }
                className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-sm text-white placeholder:text-white/40 outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <Button
                type="submit"
                size="lg"
                variant="secondary"
                leftIcon={
                  <Zap className="h-4 w-4" />
                }
                loading={checkin.isPending}
                disabled={!eventId}
              >
                Check in
              </Button>
            </form>

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
                  Scans will show up here in real
                  time.
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
                  exit={{ opacity: 0 }}
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
                      item.at
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
                  (item) => !item.already
                ).length
              }
            />

            <Stat
              label="Repeats"
              value={
                history.filter(
                  (item) => item.already
                ).length
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Tips
          </p>

          <ul className="mt-2 space-y-2 text-sm text-ink-600">
            <li className="flex items-start gap-2">
              <TicketIcon className="mt-0.5 h-4 w-4 text-brand-500" />
              Point your phone camera at the QR —
              code fills in automatically.
            </li>

            <li className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 text-brand-500" />
              Verify the attendee name matches
              their ID.
            </li>

            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 text-brand-500" />
              Check-in requests are validated
              against the selected event.
            </li>
          </ul>
        </div>
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