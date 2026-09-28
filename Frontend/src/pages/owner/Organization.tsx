import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Search,
  Globe,
  CalendarDays,
  ExternalLink,
  Users,
  UserRound,
  Ticket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { AdminAPI } from '../../lib/queries';

interface AdminOrganization {
  id: number;
  name: string;
  description?: string;
  website?: string;
  owner_id?: number | null;
  owner_name?: string;
  owner_email?: string;
  member_count?: number;
  event_count?: number;
  created_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface OrganizationsResponse {
  organizations: AdminOrganization[];
  pagination: Pagination;
}

const PAGE_SIZE = 20;

export function Organizations() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery<OrganizationsResponse>({
    queryKey: ['platform-organizations', search, page],
    queryFn: async () => {
      const response = await AdminAPI.listOrganizations({
        search: search.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      });

      return {
        organizations: response?.organizations ?? [],
        pagination: response?.pagination ?? {
          page,
          limit: PAGE_SIZE,
          total: 0,
          total_pages: 0,
        },
      };
    },
  });

  const organizations = response?.organizations ?? [];
  const pagination = response?.pagination;

  const totalOrganizations = pagination?.total ?? 0;

  const totalMembers = useMemo(
    () =>
      organizations.reduce(
        (sum, organization) => sum + (organization.member_count ?? 0),
        0,
      ),
    [organizations],
  );

  const totalEvents = useMemo(
    () =>
      organizations.reduce(
        (sum, organization) => sum + (organization.event_count ?? 0),
        0,
      ),
    [organizations],
  );

  const websiteOrganizations = useMemo(
    () =>
      organizations.filter((organization) =>
        Boolean(
          organization.website?.trim?.(),
        ),
      ).length,
    [organizations],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const goToPreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    setPage((current) =>
      Math.min(pagination?.total_pages ?? current, current + 1),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink-900">
          Organizations
        </h2>

        <p className="mt-1 text-sm text-ink-500">
          View and monitor all organizations across the EventFlow platform.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">
                Total organizations
              </p>

              <p className="mt-2 text-2xl font-semibold text-ink-900">
                {totalOrganizations}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">
                Organizations with website
              </p>

              <p className="mt-2 text-2xl font-semibold text-ink-900">
                {websiteOrganizations}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Globe className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">
                Members
              </p>

              <p className="mt-2 text-2xl font-semibold text-ink-900">
                {totalMembers}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">
                Events
              </p>

              <p className="mt-2 text-2xl font-semibold text-ink-900">
                {totalEvents}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              handleSearchChange(event.target.value)
            }
            placeholder="Search organizations..."
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Organizations */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="border-b border-ink-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-900">
                All organizations
              </h3>

              <p className="mt-1 text-sm text-ink-500">
                Platform-wide organization directory.
              </p>
            </div>

            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
              {totalOrganizations}
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-ink-50"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-ink-300" />

            <h3 className="mt-4 font-semibold text-ink-900">
              Failed to load organizations
            </h3>

            <p className="mt-1 text-sm text-ink-500">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading &&
          !isError &&
          organizations.length === 0 && (
            <div className="p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-ink-300" />

              <h3 className="mt-4 font-semibold text-ink-900">
                {search
                  ? 'No organizations found'
                  : 'No organizations yet'}
              </h3>

              <p className="mt-1 text-sm text-ink-500">
                {search
                  ? 'Try changing your search.'
                  : 'Organizations created on the platform will appear here.'}
              </p>
            </div>
          )}

        {/* Desktop */}
        {!isLoading &&
          !isError &&
          organizations.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                        Organization
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                        Owner
                      </th>

                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
                        Members
                      </th>

                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
                        Events
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                        Website
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {organizations.map((organization) => (
                      <tr
                        key={organization.id}
                        className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                      >
                        {/* Organization */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                              <Building2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">
                                {organization.name}
                              </p>

                              {organization.description && (
                                <p className="mt-0.5 max-w-xs truncate text-xs text-ink-500">
                                  {organization.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-800">
                              {organization.owner_name ||
                                (organization.owner_id
                                  ? `User #${organization.owner_id}`
                                  : 'Not available')}
                            </p>

                            {organization.owner_email && (
                              <p className="mt-0.5 truncate text-xs text-ink-500">
                                {organization.owner_email}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Members */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-sm font-medium text-ink-700">
                            <Users className="h-3.5 w-3.5" />
                            {organization.member_count ?? 0}
                          </span>
                        </td>

                        {/* Events */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-sm font-medium text-ink-700">
                            <Ticket className="h-3.5 w-3.5" />
                            {organization.event_count ?? 0}
                          </span>
                        </td>

                        {/* Website */}
                        <td className="px-6 py-4">
                          {organization.website ? (
                            <a
                              href={organization.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              Website
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-sm text-ink-400">
                              Not provided
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-ink-600">
                            {organization.created_at
                              ? new Date(
                                organization.created_at,
                              ).toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-ink-100 md:hidden">
                {organizations.map((organization) => (
                  <div
                    key={organization.id}
                    className="p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">
                          {organization.name}
                        </p>

                        {organization.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                            {organization.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Owner */}
                    <div className="mt-4">
                      <p className="text-xs text-ink-400">
                        Owner
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-ink-400" />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-700">
                            {organization.owner_name ||
                              (organization.owner_id
                                ? `User #${organization.owner_id}`
                                : 'Not available')}
                          </p>

                          {organization.owner_email && (
                            <p className="truncate text-xs text-ink-500">
                              {organization.owner_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-ink-50 p-3">
                        <p className="text-xs text-ink-400">
                          Members
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <Users className="h-3.5 w-3.5" />
                          {organization.member_count ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-ink-50 p-3">
                        <p className="text-xs text-ink-400">
                          Events
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <Ticket className="h-3.5 w-3.5" />
                          {organization.event_count ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-ink-400">
                          Created
                        </p>

                        <p className="mt-1 text-sm text-ink-700">
                          {organization.created_at
                            ? new Date(
                              organization.created_at,
                            ).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                            : '—'}
                        </p>
                      </div>

                      {organization.website && (
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600"
                        >
                          Website
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-500">
                    Showing{' '}
                    <span className="font-medium text-ink-700">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>
                    {' '}to{' '}
                    <span className="font-medium text-ink-700">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium text-ink-700">
                      {pagination.total}
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goToPreviousPage}
                      disabled={pagination.page <= 1}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <span className="rounded-lg bg-ink-100 px-3 py-2 text-sm font-medium text-ink-700">
                      {pagination.page} / {pagination.total_pages}
                    </span>

                    <button
                      type="button"
                      onClick={goToNextPage}
                      disabled={
                        pagination.page >= pagination.total_pages
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}