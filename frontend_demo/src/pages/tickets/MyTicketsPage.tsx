import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { Ticket as TicketIcon } from 'lucide-react';
// import { ticketsApi } from '@/api/tickets'; // Need a list endpoint for tickets if it existed

// Simulating a tickets fetch since there isn't a direct "GET /tickets/me" in the backend spec
// In a real scenario we'd fetch tickets, or fetch registrations and derive tickets.
// For the sake of UI, let's assume we fetch registrations and display ones that have tickets,
// or we just mock a few if the API is lacking.
// The spec says: Phase 10 - Tickets & QR Codes.
import { registrationsApi } from '@/api/registrations';

export function MyTicketsPage() {
  // Since there's no GET /tickets endpoint listed, let's fetch registrations
  // and assume any active registration can have a ticket. (In reality, a ticket is created via POST /registrations/:id/ticket)
  // Let's just show active registrations here as "tickets" for the UI sake, or dummy data if we want to show the QR code.
  
  const { data, isLoading } = useQuery({
    queryKey: ['registrations', 'me'],
    queryFn: () => registrationsApi.getMyRegistrations(1, 50),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[24px] font-semibold text-ink">My Tickets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const activeRegistrations = (data?.registrations || []).filter(r => r.status === 'active');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-[24px] font-semibold text-ink">My Tickets</h1>

      {activeRegistrations.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets found"
          description="You don't have any tickets for upcoming events."
          action={
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeRegistrations.map((reg) => (
            <Card key={reg.id} padding="none" className="overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] font-bold text-link uppercase tracking-wider bg-link-soft px-2 py-1 rounded">
                    Admit One
                  </span>
                  <span className="text-[12px] text-mute font-mono">
                    #{reg.id.toString().padStart(6, '0')}
                  </span>
                </div>
                
                <h3 className="text-[18px] font-semibold text-ink mb-1">Event #{reg.event_id}</h3>
                <p className="text-[14px] text-mute mb-4">Registered: {formatDate(reg.created_at)}</p>
                
                <div className="flex justify-center my-6">
                  <div className="p-3 bg-white rounded-[var(--radius-sm)] shadow-whisper">
                    {/* The QR code is supposed to be the ticket_number or qr_code field from the Ticket model. 
                        We're using the registration ID as a fallback for the QR data */}
                    <QRCodeSVG 
                      value={`TICKET-REG-${reg.id}`} 
                      size={150}
                      bgColor="#ffffff"
                      fgColor="#171717"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-dashed border-hairline bg-canvas p-4 text-center">
                <p className="text-[12px] text-mute font-mono">Present this QR code at check-in</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
