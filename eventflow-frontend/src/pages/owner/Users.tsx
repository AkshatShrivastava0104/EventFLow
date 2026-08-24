import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CheckCircle2, Users as UsersIcon, XCircle } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';
import { fmtDate } from '@/lib/format';
import { normalizeError } from '@/api/client';

export function OwnerUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'users', { search: debounced, page }],
    queryFn: () => adminApi.users({ search: debounced, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });

  const users = data?.users ?? [];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone with an EventFlow account."
        actions={
          <SearchInput
            className="w-64"
            placeholder="Search by name or email…"
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
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-5 w-5" />}
          title="No users found"
          description={debounced ? 'Try a different search term.' : 'No accounts yet.'}
        />
      ) : (
        <div className={isFetching ? 'opacity-60 transition' : 'transition'}>
          <Table>
            <THead>
              <TR>
                <TH>User</TH>
                <TH>Role</TH>
                <TH className="text-right">Orgs</TH>
                <TH className="text-right">Registrations</TH>
                <TH>Verified</TH>
                <TH>Joined</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} />
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{u.name}</p>
                        <p className="truncate text-xs text-ink-500">{u.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {u.role === 'admin' ? (
                      <Badge tone="accent">Admin</Badge>
                    ) : (
                      <Badge tone="neutral">User</Badge>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{u.org_count}</TD>
                  <TD className="text-right tabular-nums">{u.registration_count}</TD>
                  <TD>
                    {u.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success-700">
                        <CheckCircle2 className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                        <XCircle className="h-4 w-4" /> Unverified
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-ink-500">{fmtDate(u.created_at)}</TD>
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
