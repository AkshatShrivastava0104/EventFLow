import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { organizationsApi } from '@/api/organizations';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { Logo } from '@/components/brand/Logo';
import { UserMenu } from '@/components/layout/UserMenu';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { normalizeError } from '@/api/client';
import { useHomePath } from '@/routes/ProtectedRoute';

const schema = z.object({
  name: z.string().trim().min(2, 'Give your organization a name').max(120),
  description: z.string().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

export function OrgCreate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { setActiveOrgId, hasOrg } = useOrg();
  const home = useHomePath();
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      organizationsApi.create({ name: values.name.trim(), description: values.description?.trim() }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['organizations', 'mine'] });
      setActiveOrgId(res.organization_id);
      toast.success('Organization created');
      navigate('/org');
    },
    onError: (e) => setErr(normalizeError(e).message),
  });

  const onSubmit = handleSubmit((values) => {
    setErr(null);
    mutation.mutate(values);
  });

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        {hasOrg && (
          <Link
            to={home}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        )}

        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-50 text-accent-700">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Create your organization
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            An organization is your team&apos;s workspace for running events.
          </p>
        </div>

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {err && <Alert tone="danger">{err}</Alert>}
            <Input
              label="Organization name"
              placeholder="e.g. Acme Events Co."
              error={errors.name?.message}
              {...register('name')}
            />
            <Textarea
              label="Description"
              placeholder="What does your organization do? (optional)"
              rows={3}
              error={errors.description?.message}
              {...register('description')}
            />
            <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
              Create organization
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
