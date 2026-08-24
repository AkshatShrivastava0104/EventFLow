import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { organizationsApi } from '@/api/organizations';
import { eventsApi } from '@/api/events';
import { registrationsApi } from '@/api/registrations';
import { notificationsApi } from '@/api/notifications';
import { Card, CardTitle } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EventStatusBadge, RegistrationBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Building2, Calendar, CheckSquare, Bell, Ticket } from 'lucide-react';
import type { Event } from '@/types';

export function DashboardPage() {
  const { user } = useAuth();

  // Fetch organizations
  const { data: orgs, isLoading: loadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });

  // Fetch all events for those organizations (to simulate a global upcoming events feed)
  // We'll just fetch events for the first org if exists to keep it simple for the dashboard,
  // or use Promise.all to fetch page 1 for each org.
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['dashboard', 'events', orgs?.map(o => o.id)],
    queryFn: async () => {
      if (!orgs || orgs.length === 0) return [];
      const promises = orgs.map(org => eventsApi.listByOrg(org.id, 1, 5));
      const results = await Promise.all(promises);
      const allEvents = results.flatMap(res => res.events || []);
      // Sort by start_time
      return allEvents
        .filter(e => e.start_time)
        .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())
        .slice(0, 5);
    },
    enabled: !!orgs,
  });

  // Fetch my registrations
  const { data: regsData, isLoading: loadingRegs } = useQuery({
    queryKey: ['registrations', 'me'],
    queryFn: () => registrationsApi.getMyRegistrations(1, 10),
  });

  // Fetch notifications
  const { data: notifsData } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => notificationsApi.list(1, 1),
  });

  const isLoading = loadingOrgs || loadingEvents || loadingRegs;

  const activeRegistrations = (regsData?.registrations || []).filter(r => r.status === 'active').length || 0;
  const unreadNotifs = (notifsData?.notifications || []).filter(n => n.status === 'unread').length || 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-1.28px] text-ink">
          Welcome, {user?.name}
        </h1>
        <p className="text-[16px] text-body mt-1">Here's an overview of your events and registrations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 text-mute mb-2">
            <Calendar size={18} />
            <span className="text-[14px] font-medium mono-eyebrow">Upcoming Events</span>
          </div>
          <div className="text-[32px] font-semibold text-ink">{eventsData?.length || 0}</div>
        </Card>
        
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 text-mute mb-2">
            <CheckSquare size={18} />
            <span className="text-[14px] font-medium mono-eyebrow">Active Registrations</span>
          </div>
          <div className="text-[32px] font-semibold text-ink">{activeRegistrations}</div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 text-mute mb-2">
            <Building2 size={18} />
            <span className="text-[14px] font-medium mono-eyebrow">Organizations</span>
          </div>
          <div className="text-[32px] font-semibold text-ink">{orgs?.length || 0}</div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 text-mute mb-2">
            <Bell size={18} />
            <span className="text-[14px] font-medium mono-eyebrow">Unread Notifications</span>
          </div>
          <div className="text-[32px] font-semibold text-ink">{unreadNotifs}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Registrations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">Recent Registrations</h2>
            <Link to="/registrations" className="text-[14px] text-link hover:text-link-deep font-medium">
              View all
            </Link>
          </div>
          <Card padding="none" className="overflow-hidden">
            {(!regsData?.registrations || regsData.registrations.length === 0) ? (
              <div className="p-6 text-center text-body text-[14px]">You have no registrations yet.</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {(regsData?.registrations || []).slice(0, 5).map(reg => (
                  <li key={reg.id} className="p-4 hover:bg-canvas transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-ink">Event #{reg.event_id}</p>
                      <p className="text-[12px] text-mute">Registered {formatDate(reg.created_at)}</p>
                    </div>
                    <RegistrationBadge status={reg.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">Upcoming Events</h2>
            <Link to="/events" className="text-[14px] text-link hover:text-link-deep font-medium">
              View all
            </Link>
          </div>
          <Card padding="none" className="overflow-hidden">
            {eventsData?.length === 0 ? (
              <div className="p-6 text-center text-body text-[14px]">No upcoming events.</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {eventsData?.map(event => (
                  <li key={event.id} className="p-4 hover:bg-canvas transition-colors">
                    <Link to={`/events/${event.id}`} className="block">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-[16px] font-medium text-ink truncate pr-4">{event.title}</p>
                        <EventStatusBadge status={event.status} />
                      </div>
                      <p className="text-[14px] text-body mb-2 line-clamp-1">{event.description}</p>
                      <div className="flex items-center gap-4 text-[12px] text-mute">
                        <span>{formatDate(event.start_time)}</span>
                        <span>{event.venue}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
