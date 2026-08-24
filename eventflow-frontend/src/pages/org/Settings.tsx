import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { organizationsApi } from '@/api/organizations';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { normalizeError } from '@/api/client';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
});
type FormValues = z.infer<typeof schema>;

export function OrgSettings() {
  const { activeOrgId, activeOrg } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: activeOrg?.name ?? '',
      description: activeOrg?.description ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      organizationsApi.update(activeOrgId!, {
        name: data.name.trim(),
        description: data.description?.trim() || '',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['organizations', 'mine'] });
      toast.success('Workspace updated');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => organizationsApi.remove(activeOrgId!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['organizations', 'mine'] });
      toast.success('Workspace deleted');
      setConfirmDelete(false);
      navigate('/org');
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Manage your workspace details." />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Workspace details</CardTitle>
            <CardDescription className="mt-1">
              This information is visible to your members.
            </CardDescription>
          </div>
        </CardHeader>
        <form
          onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <Input
            label="Name"
            placeholder="Acme Events"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            label="Description"
            rows={4}
            placeholder="What does this workspace organize?"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={updateMutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 border-danger-500/40">
        <CardHeader>
          <div>
            <CardTitle className="text-danger-700">Danger zone</CardTitle>
            <CardDescription className="mt-1">
              Deleting a workspace removes its events, members, and registrations. This cannot be
              undone.
            </CardDescription>
          </div>
        </CardHeader>
        <Button
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => setConfirmDelete(true)}
        >
          Delete workspace
        </Button>
      </Card>

      {activeOrg && (
        <Alert tone="info" className="mt-6">
          Workspace ID <span className="font-mono">{activeOrg.id}</span> — share this with teammates
          so they can be added as members.
        </Alert>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${activeOrg?.name ?? 'this workspace'}?`}
        description="All associated events and data will be permanently removed."
        confirmText="Delete workspace"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
