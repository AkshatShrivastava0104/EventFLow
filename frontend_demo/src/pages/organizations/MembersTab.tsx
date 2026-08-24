import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { MoreHorizontal, UserMinus, UserCog, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function MembersTab({ orgId, ownerId }: { orgId: number, ownerId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('member');

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization', orgId, 'members'],
    queryFn: () => organizationsApi.getMembers(orgId),
  });

  const isOwner = user?.id === ownerId;

  const removeMutation = useMutation({
    mutationFn: (userId: number) => organizationsApi.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] });
      showToast.success('Member removed successfully');
      setMemberToRemove(null);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const addMutation = useMutation({
    mutationFn: (data: { email: string, role: string }) => organizationsApi.addMember(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] });
      showToast.success('Member added successfully');
      setIsAddModalOpen(false);
      setAddEmail('');
      setAddRole('member');
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number, role: string }) => organizationsApi.updateMemberRole(orgId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] });
      showToast.success('Role updated successfully');
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail) return;
    addMutation.mutate({ email: addEmail, role: addRole });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-mute">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end mb-4">
          <Button 
            size="sm" 
            leftIcon={<UserPlus size={16} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Member
          </Button>
        </div>
      )}

      <div className="bg-elevated border border-hairline rounded-[var(--radius-md)] overflow-hidden">
        <ul className="divide-y divide-hairline">
          {members?.map((member) => (
            <li key={member.user_id} className="p-4 flex items-center justify-between hover:bg-canvas transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={member.name} />
                <div>
                  <p className="text-[14px] font-medium text-ink flex items-center gap-2">
                    {member.name}
                    {member.user_id === ownerId && (
                      <span className="text-[10px] bg-ink text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Owner</span>
                    )}
                  </p>
                  <p className="text-[12px] text-mute">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[14px]">
                <div className="text-body capitalize">{member.role}</div>
                <div className="text-mute hidden sm:block">Joined {formatDate(member.joined_at)}</div>
                
                {isOwner && member.user_id !== ownerId && (
                  <div className="relative group">
                    <button className="p-1.5 text-mute hover:text-ink hover:bg-hairline rounded-md transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-elevated border border-hairline rounded-md shadow-floating hidden group-hover:block z-10 py-1">
                      <button 
                        onClick={() => updateRoleMutation.mutate({ userId: member.user_id, role: member.role === 'admin' ? 'member' : 'admin' })}
                        className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-hairline-soft flex items-center gap-2"
                      >
                        <UserCog size={14} />
                        Make {member.role === 'admin' ? 'Member' : 'Admin'}
                      </button>
                      <button 
                        onClick={() => setMemberToRemove(member.user_id)}
                        className="w-full text-left px-3 py-1.5 text-[13px] text-error hover:bg-[#ffeeee] flex items-center gap-2"
                      >
                        <UserMinus size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmModal
        isOpen={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => memberToRemove && removeMutation.mutate(memberToRemove)}
        title="Remove Member"
        isLoading={removeMutation.isPending}
        isDestructive
        confirmText="Remove"
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Member"
        description="Invite a user to this organization by email."
      >
        <form id="add-member-form" onSubmit={handleAddMember} className="space-y-4 pt-4">
          <Input
            label="User Email"
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-ink leading-5">Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="w-full bg-elevated text-ink border border-hairline rounded-[var(--radius-sm)] px-3 py-2 text-[14px] leading-5 focus:outline-2 focus:outline-link focus:border-link transition-colors"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-member-form" isLoading={addMutation.isPending}>Add Member</Button>
        </div>
      </Modal>
    </div>
  );
}
