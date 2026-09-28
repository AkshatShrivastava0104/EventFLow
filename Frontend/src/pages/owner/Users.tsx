import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    UserRound,
    Building2,
    Ticket,
    ShieldCheck,
    Shield,
    ChevronLeft,
    ChevronRight,
    Mail,
    CalendarDays,
    Users as UsersIcon,
} from 'lucide-react';

import { AdminAPI } from '../../lib/queries';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified: boolean;
    org_count: number;
    registration_count: number;
    created_at: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

interface UsersResponse {
    users: AdminUser[];
    pagination: Pagination;
}

const PAGE_SIZE = 20;

export function Users() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const {
        data: response,
        isLoading,
        isError,
    } = useQuery<UsersResponse>({
        queryKey: ['platform-users', search, page],
        queryFn: async () => {
            const response = await AdminAPI.listUsers({
                search: search.trim() || undefined,
                page,
                limit: PAGE_SIZE,
            });

            return {
                users: response?.users ?? [],
                pagination: response?.pagination ?? {
                    page,
                    limit: PAGE_SIZE,
                    total: 0,
                    total_pages: 0,
                },
            };
        },
    });

    const users = response?.users ?? [];
    const pagination = response?.pagination;

    const totalUsers = pagination?.total ?? 0;

    const verifiedUsers = useMemo(
        () =>
            users.filter(
                (user) => Boolean(user.email_verified),
            ).length,
        [users],
    );

    const platformOwners = useMemo(
        () =>
            users.filter(
                (user) =>
                    user.role?.toLowerCase() === 'platform_owner',
            ).length,
        [users],
    );

    const totalRegistrations = useMemo(
        () =>
            users.reduce(
                (sum, user) =>
                    sum + (user.registration_count ?? 0),
                0,
            ),
        [users],
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
            Math.min(
                pagination?.total_pages ?? current,
                current + 1,
            ),
        );
    };

    const formatRole = (role: string) => {
        if (!role) {
            return 'User';
        }

        if (role === 'platform_owner') {
            return 'Platform Owner';
        }

        return role
            .split('_')
            .map(
                (part) =>
                    part.charAt(0).toUpperCase() +
                    part.slice(1).toLowerCase(),
            )
            .join(' ');
    };

    const isPlatformOwner = (role: string) =>
        role?.toLowerCase() === 'platform_owner';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                    Users
                </h2>

                <p className="mt-1 text-sm text-ink-500">
                    View and monitor all users across the EventFlow
                    platform.
                </p>
            </div>

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Users */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-ink-500">
                                Total users
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {totalUsers}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <UsersIcon className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Verified */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-ink-500">
                                Verified users
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {verifiedUsers}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Platform Owners */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-ink-500">
                                Platform owners
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {platformOwners}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <Shield className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Registrations */}
                <div className="rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-ink-500">
                                Registrations
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-ink-900">
                                {totalRegistrations}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                            <Ticket className="h-5 w-5" />
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
                        placeholder="Search users by name or email..."
                        className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                </div>
            </div>

            {/* Users */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div className="border-b border-ink-100 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-display text-lg font-semibold text-ink-900">
                                All users
                            </h3>

                            <p className="mt-1 text-sm text-ink-500">
                                Platform-wide user directory.
                            </p>
                        </div>

                        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                            {totalUsers}
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
                        <UsersIcon className="mx-auto h-10 w-10 text-ink-300" />

                        <h3 className="mt-4 font-semibold text-ink-900">
                            Failed to load users
                        </h3>

                        <p className="mt-1 text-sm text-ink-500">
                            Please refresh the page and try again.
                        </p>
                    </div>
                )}

                {/* Empty */}
                {!isLoading &&
                    !isError &&
                    users.length === 0 && (
                        <div className="p-10 text-center">
                            <UsersIcon className="mx-auto h-10 w-10 text-ink-300" />

                            <h3 className="mt-4 font-semibold text-ink-900">
                                {search
                                    ? 'No users found'
                                    : 'No users yet'}
                            </h3>

                            <p className="mt-1 text-sm text-ink-500">
                                {search
                                    ? 'Try changing your search.'
                                    : 'Users registered on the platform will appear here.'}
                            </p>
                        </div>
                    )}

                {/* Data */}
                {!isLoading &&
                    !isError &&
                    users.length > 0 && (
                        <>
                            {/* Desktop */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-ink-100 bg-ink-50/60">
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                                                User
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                                                Role
                                            </th>

                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
                                                Organizations
                                            </th>

                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
                                                Registrations
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                                                Verification
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                                                Joined
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                                            >
                                                {/* User */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                            <UserRound className="h-5 w-5" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-ink-900">
                                                                {user.name || 'Unnamed user'}
                                                            </p>

                                                            <div className="mt-0.5 flex items-center gap-1.5">
                                                                <Mail className="h-3 w-3 text-ink-400" />

                                                                <p className="truncate text-xs text-ink-500">
                                                                    {user.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${isPlatformOwner(user.role)
                                                            ? 'bg-violet-50 text-violet-700'
                                                            : user.role?.toLowerCase() === 'admin'
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : user.role?.toLowerCase() === 'staff'
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-ink-50 text-ink-700'
                                                            }`}
                                                    >
                                                        {isPlatformOwner(user.role) ? (
                                                            <Shield className="h-3.5 w-3.5" />
                                                        ) : user.role?.toLowerCase() === 'staff' ? (
                                                            <UserRound className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <UserRound className="h-3.5 w-3.5" />
                                                        )}

                                                        {formatRole(user.role)}
                                                    </span>
                                                </td>

                                                {/* Organizations */}
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-sm font-medium text-ink-700">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        {user.org_count ?? 0}
                                                    </span>
                                                </td>

                                                {/* Registrations */}
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-sm font-medium text-ink-700">
                                                        <Ticket className="h-3.5 w-3.5" />
                                                        {user.registration_count ?? 0}
                                                    </span>
                                                </td>

                                                {/* Verification */}
                                                <td className="px-6 py-4">
                                                    {user.email_verified ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            Unverified
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Joined */}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-ink-600">
                                                        {user.created_at
                                                            ? new Date(
                                                                user.created_at,
                                                            ).toLocaleDateString(
                                                                undefined,
                                                                {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                },
                                                            )
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
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="p-5"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                <UserRound className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-ink-900">
                                                    {user.name || 'Unnamed user'}
                                                </p>

                                                <p className="mt-0.5 truncate text-xs text-ink-500">
                                                    {user.email}
                                                </p>

                                                <div className="mt-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${isPlatformOwner(user.role)
                                                            ? 'bg-violet-50 text-violet-700'
                                                            : 'bg-ink-50 text-ink-700'
                                                            }`}
                                                    >
                                                        {isPlatformOwner(user.role) ? (
                                                            <Shield className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <UserRound className="h-3.5 w-3.5" />
                                                        )}

                                                        {formatRole(user.role)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Verification */}
                                        <div className="mt-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-ink-400">
                                                    Verification
                                                </p>

                                                <p className="mt-1">
                                                    {user.email_verified ? (
                                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            Unverified
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xs text-ink-400">
                                                    Joined
                                                </p>

                                                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
                                                    <CalendarDays className="h-3.5 w-3.5 text-ink-400" />

                                                    {user.created_at
                                                        ? new Date(
                                                            user.created_at,
                                                        ).toLocaleDateString(
                                                            undefined,
                                                            {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            },
                                                        )
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-ink-50 p-3">
                                                <p className="text-xs text-ink-400">
                                                    Organizations
                                                </p>

                                                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                    {user.org_count ?? 0}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-ink-50 p-3">
                                                <p className="text-xs text-ink-400">
                                                    Registrations
                                                </p>

                                                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                                                    <Ticket className="h-3.5 w-3.5" />
                                                    {user.registration_count ?? 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination &&
                                pagination.total_pages > 1 && (
                                    <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-ink-500">
                                            Showing{' '}
                                            <span className="font-medium text-ink-700">
                                                {(pagination.page - 1) *
                                                    pagination.limit +
                                                    1}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-medium text-ink-700">
                                                {Math.min(
                                                    pagination.page *
                                                    pagination.limit,
                                                    pagination.total,
                                                )}
                                            </span>{' '}
                                            of{' '}
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
                                                {pagination.page} /{' '}
                                                {pagination.total_pages}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={goToNextPage}
                                                disabled={
                                                    pagination.page >=
                                                    pagination.total_pages
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