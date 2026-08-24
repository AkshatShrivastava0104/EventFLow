import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { eventsApi } from '@/api/event';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { checkinApi, type CheckInResult } from '@/api/checkin';
import { normalizeError } from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import { fmtDateTime } from '@/lib/format';

export function CheckInPage() {
    const [eventId, setEventId] = useState<string>('');
    const [code, setCode] = useState('');
    const [result, setResult] = useState<CheckInResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();

    const events = useQuery({
        queryKey: ['events', 'published'],
        queryFn: () => eventsApi.list({ page_size: 100, status: 'published' }),
    });

    const mutation = useMutation({
        mutationFn: () => checkinApi.checkIn(eventId, {
            ticket_number: code.trim(),
            qr_payload: code.trim(),
        }),
        onSuccess: (r) => {
            setResult(r);
            setError(null);
            toast.success(`${r.attendee?.name ?? 'Attendee'} checked in`);
            setCode('');
        },
        onError: (e) => {
            const err = normalizeError(e);
            if (err.status === 409) {
                setError('This ticket has already been checked in.');
            } else if (err.status === 404) {
                setError('Ticket not found.');
            } else {
                setError(err.message || 'Check-in failed');
            }
            setResult(null);
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Check-in</h1>
                <p className="mt-1 text-sm text-ink-500">Scan a ticket QR or enter the ticket number.</p>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Check in attendee</CardTitle>
                        <CardDescription>Select the event, then scan or enter the ticket.</CardDescription>
                    </div>
                </CardHeader>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <Select
                            label="Event"
                            value={eventId}
                            onChange={e => { setEventId(e.target.value); setResult(null); setError(null); }}
                            options={[
                                { label: 'Choose event…', value: '' },
                                ...(events.data?.data ?? []).map(e => ({ label: e.title, value: e.id })),
                            ]}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Input
                            label="Ticket number or QR payload"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="TKT-XXXXXX or paste QR payload"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && eventId && code.trim()) {
                                    mutation.mutate();
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <Button
                        icon={<ScanLine className="h-4 w-4" />}
                        loading={mutation.isPending}
                        disabled={!eventId || !code.trim()}
                        onClick={() => mutation.mutate()}
                    >Check in</Button>
                </div>

                {error && (
                    <div className="mt-4">
                        <Alert tone="danger" title="Could not check in">
                            {error}
                        </Alert>
                    </div>
                )}
            </Card>

            {result && (
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-success-50 text-success-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-ink-900">
                                {result.attendee?.name ?? 'Attendee'} checked in
                            </p>
                            <p className="text-xs text-ink-500">{result.attendee?.email}</p>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
                        <div>Event: <span className="font-medium">{result.event?.title ?? '—'}</span></div>
                        <div>Ticket: <span className="font-mono">{result.ticket?.ticket_number ?? '—'}</span></div>
                        <div>Registration: <span className="font-mono text-xs">{result.registration?.id}</span></div>
                        <div>Checked in at: {fmtDateTime(new Date().toISOString())}</div>
                    </div>
                </Card>
            )}
        </div>
    );
}
