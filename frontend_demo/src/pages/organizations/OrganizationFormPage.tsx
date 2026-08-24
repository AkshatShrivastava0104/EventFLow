import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const orgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type OrgForm = z.infer<typeof orgSchema>;

export function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: org, isLoading: loadingOrg } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationsApi.getById(Number(id)),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
  });

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        description: org.description || '',
      });
    }
  }, [org, reset]);

  const createMutation = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      showToast.success('Organization created successfully');
      navigate(`/organizations/${newOrg.id}`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrgForm) => organizationsApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', id] });
      showToast.success('Organization updated successfully');
      navigate(`/organizations/${id}`);
    },
    onError: (err) => showToast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: OrgForm) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditing && loadingOrg) {
    return <div>Loading...</div>; // Could use skeleton here
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost-sm" 
          onClick={() => navigate(-1)}
          className="w-8 h-8 p-0 rounded-full"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-[24px] font-semibold text-ink">
          {isEditing ? 'Edit Organization' : 'Create Organization'}
        </h1>
      </div>

      <div className="bg-elevated border border-hairline rounded-[var(--radius-lg)] p-6 shadow-whisper">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Organization Name"
            placeholder="e.g. Acme Corp"
            error={errors.name?.message}
            {...register('name')}
          />
          
          <Textarea
            label="Description (Optional)"
            placeholder="Tell us a bit about your organization..."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="flex justify-end pt-4 border-t border-hairline-soft">
            <Button 
              type="submit" 
              isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
