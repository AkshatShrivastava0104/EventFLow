import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { organizationsApi } from '@/api/organizations';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { Building2, Plus } from 'lucide-react';

export function OrganizationsListPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold text-ink">Organizations</h1>
          <Button disabled leftIcon={<Plus size={16} />}>New Organization</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-ink">Organizations</h1>
        <Link to="/organizations/new">
          <Button leftIcon={<Plus size={16} />}>New Organization</Button>
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description="You haven't joined or created any organizations yet."
          action={
            <Link to="/organizations/new">
              <Button leftIcon={<Plus size={16} />}>Create Organization</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((org) => (
            <Link key={org.id} to={`/organizations/${org.id}`} className="block">
              <Card className="h-full hover:shadow-floating hover:border-hairline-soft transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[18px] font-medium text-ink group-hover:text-link transition-colors">{org.name}</h3>
                </div>
                <p className="text-[14px] text-body mb-4 line-clamp-2">
                  {org.description || 'No description provided.'}
                </p>
                <div className="text-[12px] text-mute flex items-center gap-2">
                  <span>Created {formatDate(org.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
