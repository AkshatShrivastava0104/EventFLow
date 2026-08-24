import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations';
import { eventsApi } from '@/api/events';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { EventStatusBadge } from '@/components/ui/Badge';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import { ArrowLeft, Edit2, Trash2, Calendar, Users, Plus } from 'lucide-react';
import { MembersTab } from './MembersTab';
import { SkeletonCard } from '@/components/ui/Skeleton';

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'events' | 'members'>('events');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: org, isLoading: loadingOrg } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => organizationsApi.getById(orgId),
  });

  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['organization', orgId, 'events'],
    queryFn: () => eventsApi.listByOrg(orgId, 1, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: organizationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      showToast.success('Organization deleted');
      navigate('/organizations');
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  if (loadingOrg) {
    return <SkeletonCard />;
  }

  if (!org) {
    return <div>Organization not found</div>;
  }

  const isOwner = user?.id === org.owner_id;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <Link to="/organizations" className="inline-flex items-center gap-2 text-[14px] text-mute hover:text-ink transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Organizations
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-1.28px] text-ink">{org.name}</h1>
            <p className="text-[16px] text-body mt-2 max-w-2xl">{org.description || 'No description provided.'}</p>
            <p className="text-[12px] text-mute mt-2">Created {formatDate(org.created_at)}</p>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/organizations/${org.id}/edit`)} leftIcon={<Edit2 size={16} />}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} leftIcon={<Trash2 size={16} />}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hairline">
        <nav className="flex gap-6">
          <button
            className={`py-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'events' ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink'
            }`}
            onClick={() => setActiveTab('events')}
          >
            <Calendar size={16} /> Events
          </button>
          <button
            className={`py-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'members' ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink'
            }`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} /> Members
          </button>
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <Link to={`/organizations/${org.id}/events/new`}>
                <Button size="sm" leftIcon={<Plus size={16} />}>Create Event</Button>
              </Link>
            </div>
            
            {loadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
            ) : !eventsData || eventsData.events.length === 0 ? (
              <Card className="text-center py-12">
                <Calendar size={32} className="mx-auto text-mute mb-3" />
                <p className="text-[16px] font-medium text-ink">No events yet</p>
                <p className="text-[14px] text-body mt-1">Create your first event to get started.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {eventsData.events.map((event) => (
                  <Link key={event.id} to={`/events/${event.id}`} className="block">
                    <Card padding="md" className="hover:border-hairline-soft hover:shadow-floating transition-all h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[16px] font-medium text-ink">{event.title}</h3>
                        <EventStatusBadge status={event.status} />
                      </div>
                      <p className="text-[14px] text-body line-clamp-2 mb-4">{event.description}</p>
                      <div className="flex items-center justify-between text-[12px] text-mute">
                        <span>{formatDate(event.start_time)}</span>
                        <span>{event.venue}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <MembersTab orgId={org.id} ownerId={org.owner_id} />
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate(org.id)}
        title="Delete Organization"
        description="Are you sure you want to delete this organization? This will permanently delete all associated events and registrations."
        confirmText="Delete Organization"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
