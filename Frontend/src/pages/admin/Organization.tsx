import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    Globe,
    Loader2,
    Pencil,
    Save,
    Users,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { OrgsAPI, EventsAPI, StaffAPI } from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';

type Organization = {
    id: number | string;
    owner_id?: number | string | null;
    name: string;
    description?: string;
    website?: string;
    slug?: string;
    created_at?: string;
    updated_at?: string;
};

export function Organization() {
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const {
        data: organizations = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['organizations', 'admin'],
        queryFn: () => OrgsAPI.list(),
        staleTime: 60_000,
    });

    const organization = organizations[0];

    const {
        data: members = [],
        isLoading: membersLoading,
    } = useQuery({
        queryKey: ['organization', organization?.id, 'members'],
        queryFn: () => StaffAPI.list(organization!.id),
        enabled: Boolean(organization?.id),
        staleTime: 60_000,
    });

    const {
        data: eventsResponse,
        isLoading: eventsLoading,
    } = useQuery({
        queryKey: ['events', 'admin', organization?.id],
        queryFn: () =>
            EventsAPI.listByOrganization(organization!.id, {
                page: 1,
                limit: 1,
            }),
        enabled: Boolean(organization?.id),
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!organization || isEditing) return;

        setName(organization.name ?? '');
        setDescription(organization.description ?? '');
    }, [organization, isEditing]);

    const updateMutation = useMutation({
        mutationFn: () =>
            OrgsAPI.update(organization!.id, {
                name: name.trim(),
                description: description.trim(),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['organizations', 'admin'],
            });

            await queryClient.invalidateQueries({
                queryKey: ['organizations'],
            });

            setIsEditing(false);
            toast.success('Organization updated successfully.');
        },
        onError: () => {
            toast.error('Unable to update organization.');
        },
    });

    const cancelEditing = () => {
        setName(organization?.name ?? '');
        setDescription(organization?.description ?? '');
        setIsEditing(false);
    };

    const submit = () => {
        if (!name.trim()) {
            toast.error('Organization name is required.');
            return;
        }

        if (name.trim().length > 100) {
            toast.error('Organization name must be 100 characters or less.');
            return;
        }

        if (description.trim().length > 500) {
            toast.error('Description must be 500 characters or less.');
            return;
        }

        updateMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="mt-2 h-4 w-80" />
                </div>

                <Skeleton className="h-44 rounded-2xl" />

                <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                </div>

                <Skeleton className="h-72 rounded-2xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
                <h3 className="font-semibold text-red-900">
                    Failed to load organization
                </h3>
                <p className="mt-1 text-sm text-red-700">
                    Please refresh the page and try again.
                </p>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
                <Building2 className="mx-auto h-10 w-10 text-ink-300" />

                <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">
                    No organization found
                </h3>

                <p className="mt-1 text-sm text-ink-500">
                    Your account is not currently associated with an organization.
                </p>
            </div>
        );
    }

    const eventCount = Array.isArray(eventsResponse)
        ? eventsResponse.length
        : 0;

    const memberCount = members.length;

    const adminCount = members.filter(
        (member: any) =>
            String(member.role ?? '').toUpperCase() === 'ADMIN',
    ).length;

    const staffCount = members.filter(
        (member: any) =>
            ['STAFF', 'VOLUNTEER'].includes(
                String(member.role ?? '').toUpperCase(),
            ),
    ).length;

    const createdAt = organization.created_at
        ? new Date(organization.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        : '—';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                        Organization
                    </p>

                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
                        Organization details
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                        Manage your organization profile and view its basic platform details.
                    </p>
                </div>

                {!isEditing ? (
                    <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="h-4 w-4" />}
                        onClick={() => setIsEditing(true)}
                    >
                        Edit organization
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<X className="h-4 w-4" />}
                            onClick={cancelEditing}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={
                                updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )
                            }
                            onClick={submit}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <Building2 className="h-8 w-8" />
                    </div>

                    <div className="min-w-0 flex-1">
                        {!isEditing ? (
                            <>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl font-semibold text-ink-900">
                                        {organization.name}
                                    </h3>

                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Active
                                    </span>
                                </div>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
                                    {organization.description?.trim() ||
                                        'No organization description has been added yet.'}
                                </p>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <Input
                                    label="Organization name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    maxLength={100}
                                    placeholder="Enter organization name"
                                />

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                        Description
                                    </label>

                                    <textarea
                                        value={description}
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                        maxLength={500}
                                        rows={4}
                                        placeholder="Describe your organization..."
                                        className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                                    />

                                    <p className="mt-1 text-right text-[11px] text-ink-400">
                                        {description.length}/500
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isEditing && (
                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Created {createdAt}
                                </span>

                                {organization.website && (
                                    <a
                                        href={organization.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700"
                                    >
                                        <Globe className="h-3.5 w-3.5" />
                                        Website
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}

                                {organization.slug && (
                                    <span className="font-mono text-ink-400">
                                        /{organization.slug}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    icon={<Users className="h-5 w-5" />}
                    label="Members"
                    value={membersLoading ? '—' : memberCount}
                    detail={
                        membersLoading
                            ? 'Loading...'
                            : `${adminCount} admin${adminCount === 1 ? '' : 's'} · ${staffCount} staff`
                    }
                />

                <SummaryCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Events"
                    value={eventsLoading ? '—' : eventCount}
                    detail="Organization events"
                />

                <SummaryCard
                    icon={<Building2 className="h-5 w-5" />}
                    label="Organization ID"
                    value={String(organization.id)}
                    detail="Internal identifier"
                />
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">
                            Organization information
                        </h3>

                        <p className="mt-1 text-sm text-ink-500">
                            Basic information used across your organization console.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <InfoRow
                        label="Organization ID"
                        value={String(organization.id)}
                    />

                    <InfoRow
                        label="Owner ID"
                        value={
                            organization.owner_id
                                ? String(organization.owner_id)
                                : 'Not available'
                        }
                    />

                    <InfoRow
                        label="Created"
                        value={createdAt}
                    />

                    <InfoRow
                        label="Website"
                        value={organization.website || 'Not provided'}
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    detail,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    detail: string;
}) {
    return (
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    {label}
                </p>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    {icon}
                </div>
            </div>

            <p className="mt-3 font-display text-2xl font-semibold text-ink-900">
                {value}
            </p>

            <p className="mt-1 text-xs text-ink-500">{detail}</p>
        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-medium text-ink-800">
                {value}
            </p>
        </div>
    );
}
