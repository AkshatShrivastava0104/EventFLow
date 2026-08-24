import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { organizationsApi } from '@/api/organizations';
import { eventsApi } from '@/api/events';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EventStatusBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Calendar, Building2 } from 'lucide-react';
import type { Event, Organization } from '@/types';

export function EventsPage() {
  const { data: orgs, isLoading: loadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['events', 'all', orgs?.map(o => o.id)],
    queryFn: async () => {
      if (!orgs || orgs.length === 0) return [];
      const promises = orgs.map(org => eventsApi.listByOrg(org.id, 1, 50));
      const results = await Promise.all(promises);
      const allEvents = results.flatMap(res => res.events);
      return allEvents.sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime());
    },
    enabled: !!orgs,
  });

  if (loadingOrgs || loadingEvents) {
    return (
      <div className="space-y-6">
        <h1 className="text-[24px] font-semibold text-ink">Events</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const getOrgName = (orgId: number) => orgs?.find(o => o.id === orgId)?.name || 'Unknown Org';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-ink">Events</h1>
      </div>

      {!events || events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description="There are no events available across your organizations."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="block">
              <Card className="h-full hover:shadow-floating hover:border-hairline-soft transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[18px] font-medium text-ink group-hover:text-link transition-colors pr-2 line-clamp-2">{event.title}</h3>
                  <EventStatusBadge status={event.status} />
                </div>
                
                <p className="text-[14px] text-body mb-4 line-clamp-2 flex-1">
                  {event.description || 'No description provided.'}
                </p>
                
                <div className="space-y-2 text-[13px] text-mute border-t border-hairline-soft pt-3 mt-auto">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} />
                    <span className="truncate">{getOrgName(event.organization_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{formatDate(event.start_time)} — {event.venue || 'No venue'}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
