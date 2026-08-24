import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { checkinApi } from '@/api/checkin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const checkinMutation = useMutation({
    mutationFn: (ticket: string) => checkinApi.checkIn(Number(eventId), ticket),
    onSuccess: (res) => {
      setResult({ type: 'success', message: res.message });
      setTicketNumber(''); // clear for next scan
    },
    onError: (err) => {
      setResult({ type: 'error', message: getErrorMessage(err) });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim()) return;
    checkinMutation.mutate(ticketNumber.trim());
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-[14px] text-mute hover:text-ink transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Event
        </Link>
        <h1 className="text-[24px] font-semibold tracking-[-0.4px] text-ink">Event Check-In</h1>
        <p className="text-[14px] text-body mt-1">Scan QR code or enter ticket number manually.</p>
      </div>

      {result && (
        <div className={`p-4 rounded-[var(--radius-md)] border flex items-start gap-3 ${
          result.type === 'success' 
            ? 'bg-link-soft/30 border-link/20 text-link-deep' 
            : 'bg-error/5 border-error/20 text-error-deep'
        }`}>
          {result.type === 'success' ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={20} className="mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-[14px] font-medium leading-5">{result.message}</p>
          </div>
        </div>
      )}

      <div className="bg-elevated border border-hairline rounded-[var(--radius-lg)] p-6 shadow-floating">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ticket Number"
            placeholder="Scan or type ticket number..."
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            autoFocus
            className="text-lg py-3"
          />
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            isLoading={checkinMutation.isPending}
            disabled={!ticketNumber.trim()}
          >
            Check In
          </Button>
        </form>
      </div>
      
      <div className="text-center">
        <p className="text-[12px] text-mute">
          Ensure your scanner is acting as a keyboard input.
        </p>
      </div>
    </div>
  );
}
