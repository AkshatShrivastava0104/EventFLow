import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { fmtDate } from '@/lib/format';
import { normalizeError } from '@/api/client';

export function OwnerOrganizations() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'organizations', { search: debounced, page }],
    queryFn: () => adminApi.organizations({ search: debounced, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });

  const orgs = data?.organizations ?? [];

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every workspace on the platform."
        actions={
          <SearchInput
            className="w-64"
            placeholder="Search organizations…"
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
        }
      />

      {error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(error).message}
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No organizations found"
          description={debounced ? 'Try a different search term.' : 'No workspaces have been created yet.'}
        />
      ) : (
        <div className={isFetching ? 'opacity-60 transition' : 'transition'}>
          <Table>
            <THead>
              <TR>
                <TH>Organization</TH>
                <TH>Owner</TH>
                <TH className="text-right">Members</TH>
                <TH className="text-right">Events</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {orgs.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={o.name} size={34} />
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{o.name}</p>
                        {o.description && (
                          <p className="truncate text-xs text-ink-500">{o.description}</p>
                        )}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {o.owner_id ? (
                      <div className="min-w-0">
                        <p className="text-ink-900">{o.owner_name || '—'}</p>
                        <p className="truncate text-xs text-ink-500">{o.owner_email}</p>
                      </div>
                    ) : (
                      <span className="text-ink-400">No owner</span>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{o.member_count}</TD>
                  <TD className="text-right tabular-nums">{o.event_count}</TD>
                  <TD className="whitespace-nowrap text-ink-500">{fmtDate(o.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {data && (
        <Pagination
          className="mt-4"
          page={data.pagination.page}
          totalPages={data.pagination.total_pages}
          onChange={setPage}
        />
      )}
    </div>
  );
}
