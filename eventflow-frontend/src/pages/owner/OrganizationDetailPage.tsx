import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { organizationsApi } from '@/api/organizations';
import { eventsApi } from '@/api/event';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { normalizeError } from '@/api/client';
import { fmtDateTime } from '@/lib/format';

const memberSchema = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'staff']),
});

export function OrganizationDetailPage() {
    const { orgId = '' } = useParams();
    const qc = useQueryClient();
    const toast = useToast();
    const [memberOpen, setMemberOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<string | null>(null);

    const org = useQuery({
        queryKey: ['organizations', orgId],
        queryFn: () => organizationsApi.get(orgId),
    });
    const members = useQuery({
        queryKey: ['organizations', orgId, 'members'],
        queryFn: () => organizationsApi.members.list(orgId, { page_size: 100 }),
        enabled: !!orgId,
    });
    const orgEvents = useQuery({
        queryKey: ['organizations', orgId, 'events'],
        queryFn: () => eventsApi.listForOrg(orgId, { page_size: 50 }),
        enabled: !!orgId,
    });

    const addMember = useMutation({
        mutationFn: (v: z.infer<typeof memberSchema>) => organizationsApi.members.add(orgId, v),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
            toast.success('Member added');
            setMemberOpen(false);
            memberForm.reset();
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    const removeMember = useMutation({
        mutationFn: (userId: string) => organizationsApi.members.remove(orgId, userId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
            toast.success('Member removed');
            setRemoveTarget(null);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    const memberForm = useForm<z.infer<typeof memberSchema>>({
        resolver: zodResolver(memberSchema),
        defaultValues: { email: '', role: 'staff' },
    });

    return (
        <div className="space-y-6">
            <div>
                <Link to="/owner/organizations" className="text-sm text-ink-500 hover:text-ink-900">← Organizations</Link>
                {org.isLoading ? (
                    <Skeleton className="mt-2 h-8 w-64" />
                ) : (
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{org.data?.name}</h1>
                )}
                {org.data?.description && <p className="mt-1 text-sm text-ink-500">{org.data.description}</p>}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Members */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <div>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>People who can manage events for this organization.</CardDescription>
                        </div>
                        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setMemberOpen(true)}>Add</Button>
                    </CardHeader>

                    {members.isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : (members.data?.data?.length ?? 0) === 0 ? (
                        <EmptyState title="No members yet" description="Add admins or staff to help manage events." />
                    ) : (
                        <div className="divide-y divide-ink-100">
                            {members.data!.data.map(m => (
                                <div key={m.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">{m.name}</p>
                                        <p className="text-xs text-ink-500">{m.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone="accent">{m.role}</Badge>
                                        {m.role !== 'owner' && (
                                            <button
                                                onClick={() => setRemoveTarget(m.user_id)}
                                                className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                                                aria-label="Remove member"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Events */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div>
                            <CardTitle>Events</CardTitle>
                            <CardDescription>Events belonging to this organization.</CardDescription>
                        </div>
                        <Link to={`/owner/events/new?org=${orgId}`}>
                            <Button size="sm" icon={<Plus className="h-4 w-4" />}>New event</Button>
                        </Link>
                    </CardHeader>

                    {orgEvents.isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                        </div>
                    ) : (orgEvents.data?.data?.length ?? 0) === 0 ? (
                        <EmptyState title="No events yet" />
                    ) : (
                        <div className="divide-y divide-ink-100">
                            {orgEvents.data!.data.map(ev => (
                                <Link
                                    key={ev.id}
                                    to={`/owner/events/${ev.id}`}
                                    className="flex items-center justify-between py-3 hover:bg-ink-50/60"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-ink-900">{ev.title}</p>
                                        <p className="text-xs text-ink-500">{fmtDateTime(ev.starts_at)} · {ev.venue}</p>
                                    </div>
                                    <Badge tone={ev.status === 'published' ? 'success' : 'neutral'}>{ev.status}</Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Add member modal */}
            <Modal
                open={memberOpen}
                onClose={() => setMemberOpen(false)}
                title="Add member"
                description="Invite an existing user by email."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setMemberOpen(false)}>Cancel</Button>
                        <Button
                            loading={addMember.isPending}
                            onClick={memberForm.handleSubmit(v => addMember.mutate(v))}
                        >
                            Add member
                        </Button>
                    </>
                }
            >
                <form className="space-y-3" onSubmit={memberForm.handleSubmit(v => addMember.mutate(v))}>
                    <Input label="Email" {...memberForm.register('email')} error={memberForm.formState.errors.email?.message} />
                    <Select
                        label="Role"
                        {...memberForm.register('role')}
                        options={[
                            { label: 'Admin', value: 'admin' },
                            { label: 'Staff', value: 'staff' },
                        ]}
                    />
                    <button type="submit" hidden />
                </form>
            </Modal>

            <ConfirmDialog
                open={!!removeTarget}
                title="Remove member?"
                description="They will lose access to this organization immediately."
                loading={removeMember.isPending}
                onClose={() => setRemoveTarget(null)}
                onConfirm={() => removeTarget && removeMember.mutate(removeTarget)}
            />
        </div>
    );
}
