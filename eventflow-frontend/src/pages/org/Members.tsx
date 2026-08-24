import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { organizationsApi } from '@/api/organizations';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MEMBER_ROLE_META, ASSIGNABLE_ROLE_OPTIONS } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import type { AssignableRole, OrganizationMember } from '@/types/organization';
import { normalizeError } from '@/api/client';

export function Members() {
  const { activeOrgId } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [addRole, setAddRole] = useState<AssignableRole>('MEMBER');
  const [removing, setRemoving] = useState<OrganizationMember | null>(null);

  const membersQ = useQuery({
    queryKey: ['org', activeOrgId, 'members'],
    queryFn: () => organizationsApi.members(activeOrgId!),
    enabled: activeOrgId != null,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', activeOrgId, 'members'] });

  const addMutation = useMutation({
    mutationFn: () =>
      organizationsApi.addMember(activeOrgId!, { user_id: Number(userId), role: addRole }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Member added');
      setShowAdd(false);
      setUserId('');
      setAddRole('MEMBER');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ uid, role }: { uid: number; role: AssignableRole }) =>
      organizationsApi.updateMember(activeOrgId!, uid, { role }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Role updated');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const removeMutation = useMutation({
    mutationFn: (uid: number) => organizationsApi.removeMember(activeOrgId!, uid),
    onSuccess: async () => {
      await invalidate();
      toast.success('Member removed');
      setRemoving(null);
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const members = membersQ.data?.members ?? [];
  const validUserId = /^\d+$/.test(userId) && Number(userId) > 0;

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage who can access this workspace and what they can do."
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Add member
          </Button>
        }
      />

      {membersQ.error && (
        <Alert tone="danger" className="mb-4">
          {normalizeError(membersQ.error).message}
        </Alert>
      )}

      {membersQ.isLoading ? (
        <Skeleton className="h-64" />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No members yet"
          description="Add teammates by their user ID to collaborate."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>Joined</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {members.map((m) => {
              const isOwner = m.role === 'OWNER';
              const roleMeta = MEMBER_ROLE_META[m.role];
              return (
                <TR key={m.user_id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} size={34} />
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{m.name}</p>
                        <p className="truncate text-xs text-ink-500">{m.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {isOwner ? (
                      <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                    ) : (
                      <div className="w-36">
                        <Select
                          value={m.role}
                          options={ASSIGNABLE_ROLE_OPTIONS}
                          disabled={roleMutation.isPending}
                          onChange={(e) =>
                            roleMutation.mutate({
                              uid: m.user_id,
                              role: e.target.value as AssignableRole,
                            })
                          }
                        />
                      </div>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-ink-500">{fmtDate(m.joined_at)}</TD>
                  <TD className="text-right">
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setRemoving(m)}
                      >
                        Remove
                      </Button>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      {/* Add member modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add member"
        description="Enter the user's ID and choose a role."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              loading={addMutation.isPending}
              disabled={!validUserId}
              onClick={() => addMutation.mutate()}
            >
              Add member
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="User ID"
            type="number"
            min={1}
            placeholder="e.g. 42"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            hint="Ask the teammate for their account ID."
          />
          <Select
            label="Role"
            value={addRole}
            options={ASSIGNABLE_ROLE_OPTIONS}
            onChange={(e) => setAddRole(e.target.value as AssignableRole)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.name ?? 'member'}?`}
        description="They will lose access to this workspace."
        confirmText="Remove"
        tone="danger"
        loading={removeMutation.isPending}
        onConfirm={() => removing && removeMutation.mutate(removing.user_id)}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
