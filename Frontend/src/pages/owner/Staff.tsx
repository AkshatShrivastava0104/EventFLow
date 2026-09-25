import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  Save,
} from 'lucide-react';

import {
  StaffAPI,
  OrgsAPI,
} from '../../lib/queries';

import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Input,
  Select,
} from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

import toast from 'react-hot-toast';

type MemberRole = 'ADMIN' | 'STAFF';

type MemberForm = {
  user_id: string;
  role: MemberRole;
};

export function StaffPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<MemberForm>({
    user_id: '',
    role: 'STAFF',
  });

  const [editingUserId, setEditingUserId] =
    useState<number | null>(null);

  const [editingRole, setEditingRole] =
    useState<MemberRole>('STAFF');

  /*
   * =========================================================
   * Organization
   * =========================================================
   */

  const {
    data: orgs,
    isLoading: orgsLoading,
  } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => OrgsAPI.list(),
  });

  const org = orgs?.[0];
  const orgId = org?.id;

  /*
   * =========================================================
   * Members
   * =========================================================
   */

  const {
    data: members,
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ['staff', orgId],
    queryFn: () =>
      StaffAPI.list(orgId!),
    enabled: !!orgId,
  });

  /*
   * =========================================================
   * Add Member
   * =========================================================
   */

  const add = useMutation({
    mutationFn: () => {
      if (!orgId) {
        throw new Error(
          'Organization not found'
        );
      }

      if (!form.user_id.trim()) {
        throw new Error(
          'User ID is required'
        );
      }

      const userId = Number(form.user_id);

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        throw new Error(
          'Enter a valid user ID'
        );
      }

      return StaffAPI.create(orgId, {
        user_id: userId,
        role: form.role,
      });
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['staff', orgId],
      });

      setOpen(false);

      setForm({
        user_id: '',
        role: 'STAFF',
      });

      toast.success(
        'Member added successfully'
      );
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add member'
      );
    },
  });

  /*
   * =========================================================
   * Update Member Role
   * =========================================================
   */

  const updateRole = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: MemberRole;
    }) => {
      if (!orgId) {
        throw new Error(
          'Organization not found'
        );
      }

      return StaffAPI.update(
        orgId,
        userId,
        { role }
      );
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['staff', orgId],
      });

      setEditingUserId(null);

      toast.success(
        'Member role updated successfully'
      );
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update member role'
      );
    },
  });

  /*
   * =========================================================
   * Remove Member
   * =========================================================
   */

  const remove = useMutation({
    mutationFn: (userId: number) => {
      if (!orgId) {
        throw new Error(
          'Organization not found'
        );
      }

      return StaffAPI.remove(
        orgId,
        userId
      );
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['staff', orgId],
      });

      toast.success(
        'Member removed successfully'
      );
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to remove member'
      );
    },
  });

  /*
   * =========================================================
   * Helpers
   * =========================================================
   */

  const getMemberUserId = (
    member: any
  ): number | null => {
    const id =
      member?.user_id ??
      member?.userId ??
      member?.id;

    const parsed = Number(id);

    return Number.isInteger(parsed) &&
      parsed > 0
      ? parsed
      : null;
  };

  const getMemberName = (
    member: any
  ) => {
    return (
      member?.user_name ??
      member?.userName ??
      member?.name ??
      'Unknown user'
    );
  };

  const getMemberEmail = (
    member: any
  ) => {
    return (
      member?.user_email ??
      member?.userEmail ??
      member?.email ??
      '—'
    );
  };

  const getMemberRole = (
    member: any
  ): MemberRole => {
    const role = String(
      member?.role ?? 'STAFF'
    ).toUpperCase();

    return role === 'ADMIN'
      ? 'ADMIN'
      : 'STAFF';
  };

  const getJoinedDate = (
    member: any
  ) => {
    const date =
      member?.joined_at ??
      member?.joinedAt ??
      member?.created_at ??
      member?.createdAt;

    if (!date) {
      return '—';
    }

    const parsed = new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '—';
    }

    return parsed.toLocaleDateString();
  };

  const startEditing = (
    userId: number,
    role: MemberRole
  ) => {
    setEditingUserId(userId);
    setEditingRole(role);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
  };

  const saveRole = (userId: number) => {
    updateRole.mutate({
      userId,
      role: editingRole,
    });
  };

  const isLoading =
    orgsLoading ||
    membersLoading;

  /*
   * =========================================================
   * Render
   * =========================================================
   */

  return (
    <div className="space-y-4">
      {/* Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Members & roles
          </h2>

          <p className="text-sm text-ink-500">
            Manage your organization members
            and their roles.
          </p>
        </div>

        <Button
          variant="secondary"
          leftIcon={
            <UserPlus className="h-4 w-4" />
          }
          onClick={() =>
            setOpen(true)
          }
          disabled={!orgId}
        >
          Add member
        </Button>
      </div>

      {/* Organization */}

      {orgId && (
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Organization
          </p>

          <div className="mt-1 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {org?.name}
              </h3>

              {org?.description && (
                <p className="text-sm text-ink-500">
                  {org.description}
                </p>
              )}
            </div>

            <Badge tone="blue">
              {members?.length ?? 0}{' '}
              members
            </Badge>
          </div>
        </div>
      )}

      {/* No organization */}

      {!orgsLoading &&
        !orgId && (
          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <EmptyState
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
              title="No organization found"
              description="Create an organization before managing members."
            />
          </div>
        )}

      {/* Members table */}

      {orgId && (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">
                    Member
                  </th>

                  <th className="px-4 py-3">
                    Role
                  </th>

                  <th className="px-4 py-3">
                    User ID
                  </th>

                  <th className="px-4 py-3">
                    Joined
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-100">
                {isLoading &&
                  Array.from({
                    length: 3,
                  }).map((_, i) => (
                    <tr key={i}>
                      <td
                        colSpan={5}
                        className="p-3"
                      >
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))}

                {!isLoading &&
                  (!members ||
                    members.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6"
                      >
                        <EmptyState
                          icon={
                            <ShieldCheck className="h-5 w-5" />
                          }
                          title="No members yet"
                          description="Add users to your organization and assign ADMIN or STAFF roles."
                          action={
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setOpen(true)
                              }
                            >
                              Add member
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )}

                {!isLoading &&
                  members?.map(
                    (member: any) => {
                      const userId =
                        getMemberUserId(
                          member
                        );

                      const name =
                        getMemberName(
                          member
                        );

                      const email =
                        getMemberEmail(
                          member
                        );

                      const role =
                        getMemberRole(
                          member
                        );

                      const isEditing =
                        userId !== null &&
                        editingUserId ===
                        userId;

                      return (
                        <tr
                          key={
                            userId ??
                            `${email}-${role}`
                          }
                          className="hover:bg-ink-50"
                        >
                          {/* Member */}

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold uppercase text-white">
                                {name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  'U'}
                              </div>

                              <div>
                                <div className="font-semibold">
                                  {name}
                                </div>

                                <div className="text-xs text-ink-500">
                                  {email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}

                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={
                                    editingRole
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    setEditingRole(
                                      e.target
                                        .value as MemberRole
                                    )
                                  }
                                >
                                  <option value="STAFF">
                                    STAFF
                                  </option>

                                  <option value="ADMIN">
                                    ADMIN
                                  </option>
                                </Select>
                              </div>
                            ) : (
                              <Badge
                                tone={
                                  role ===
                                    'ADMIN'
                                    ? 'blue'
                                    : 'green'
                                }
                              >
                                {role}
                              </Badge>
                            )}
                          </td>

                          {/* User ID */}

                          <td className="px-4 py-3 text-xs text-ink-500">
                            {userId ?? '—'}
                          </td>

                          {/* Joined */}

                          <td className="px-4 py-3 text-xs text-ink-500">
                            {getJoinedDate(
                              member
                            )}
                          </td>

                          {/* Actions */}

                          <td className="px-4 py-3 text-right">
                            {userId && (
                              <div className="flex items-center justify-end gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveRole(
                                          userId
                                        )
                                      }
                                      disabled={
                                        updateRole.isPending
                                      }
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Save className="h-3 w-3" />
                                      Save
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        cancelEditing
                                      }
                                      disabled={
                                        updateRole.isPending
                                      }
                                      className="rounded-md px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditing(
                                          userId,
                                          role
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                                    >
                                      <ShieldCheck className="h-3 w-3" />
                                      Change role
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        remove.mutate(
                                          userId
                                        )
                                      }
                                      disabled={
                                        remove.isPending
                                      }
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Modal */}

      <Modal
        open={open}
        onClose={() => {
          if (!add.isPending) {
            setOpen(false);
          }
        }}
        title="Add organization member"
      >
        <div className="space-y-4">
          <Input
            label="User ID"
            type="number"
            min="1"
            placeholder="e.g. 5"
            value={form.user_id}
            onChange={(e) =>
              setForm({
                ...form,
                user_id:
                  e.target.value,
              })
            }
          />

          <Select
            label="Organization role"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role:
                  e.target
                    .value as MemberRole,
              })
            }
          >
            <option value="STAFF">
              STAFF — event operations &
              check-in
            </option>

            <option value="ADMIN">
              ADMIN — manage organization
            </option>
          </Select>

          <p className="text-xs text-ink-500">
            The user must already have an
            EventFlow account. Their
            organization role is separate
            from their platform role.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setOpen(false)
              }
              disabled={add.isPending}
            >
              Cancel
            </Button>

            <Button
              variant="secondary"
              loading={add.isPending}
              onClick={() =>
                add.mutate()
              }
            >
              Add member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}