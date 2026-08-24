import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { registrationsApi } from '@/api/registrations';
import { ticketsApi } from '@/api/tickets';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { RegistrationBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import { CheckSquare, XCircle, Ticket } from 'lucide-react';

export function MyRegistrationsPage() {
  const [page, setPage] = useState(1);
  const [cancelRegId, setCancelRegId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['registrations', 'me', page],
    queryFn: () => registrationsApi.getMyRegistrations(page, 10),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => registrationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', 'me'] });
      showToast.success('Registration cancelled successfully');
      setCancelRegId(null);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const generateTicketMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.create(id),
    onSuccess: () => {
      showToast.success('Ticket generated successfully');
      // A full implementation would redirect to tickets page or show it
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[24px] font-semibold text-ink">My Registrations</h1>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-[24px] font-semibold text-ink">My Registrations</h1>

      {!data || !data.registrations || data.registrations.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No registrations found"
          description="You haven't registered for any events yet."
          action={
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {(data.registrations || []).map((reg) => (
              <li key={reg.id} className="p-6 hover:bg-canvas transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <Link to={`/events/${reg.event_id}`} className="text-[16px] font-medium text-ink hover:text-link transition-colors">
                        Event #{reg.event_id}
                      </Link>
                      <RegistrationBadge status={reg.status} />
                    </div>
                    <div className="text-[14px] text-mute flex items-center gap-2">
                      <span>Registered on {formatDate(reg.created_at)}</span>
                      <span>·</span>
                      <span className="capitalize">Payment: {reg.payment_status}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {reg.status === 'active' && (
                      <>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          leftIcon={<Ticket size={16} />}
                          onClick={() => generateTicketMutation.mutate(reg.id)}
                          isLoading={generateTicketMutation.isPending && generateTicketMutation.variables === reg.id}
                        >
                          Get Ticket
                        </Button>
                        <Button 
                          variant="ghost-sm" 
                          className="text-error hover:bg-[#ffeeee]"
                          leftIcon={<XCircle size={16} />}
                          onClick={() => setCancelRegId(reg.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          <Pagination data={data.pagination} onPageChange={setPage} />
        </Card>
      )}

      <ConfirmModal
        isOpen={cancelRegId !== null}
        onClose={() => setCancelRegId(null)}
        onConfirm={() => cancelRegId && cancelMutation.mutate(cancelRegId)}
        title="Cancel Registration"
        description="Are you sure you want to cancel this registration? You will lose your spot."
        confirmText="Yes, Cancel"
        isDestructive
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
