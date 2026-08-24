import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { organizationsApi } from '@/api/organizations';
import { useToast } from '@/contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '@/api/client';

const schema = z.object({
    name: z.string().min(2, 'Required'),
    description: z.string().max(500).optional(),
});
type Values = z.infer<typeof schema>;

export function OrganizationCreatePage() {
    const navigate = useNavigate();
    const toast = useToast();
    const qc = useQueryClient();
    const { register, handleSubmit, formState: { errors } } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', description: '' },
    });

    const mutation = useMutation({
        mutationFn: (v: Values) => organizationsApi.create(v),
        onSuccess: (org) => {
            qc.invalidateQueries({ queryKey: ['organizations'] });
            toast.success('Organization created');
            navigate(`/owner/organizations/${org.id}`);
        },
        onError: (e) => toast.error(normalizeError(e).message),
    });

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <Link to="/owner/organizations" className="text-sm text-ink-500 hover:text-ink-900">← Back</Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">New organization</h1>
            </div>
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>Organizations host events and members.</CardDescription>
                    </div>
                </CardHeader>
                <form
                    onSubmit={handleSubmit(v => mutation.mutate(v))}
                    className="space-y-4"
                >
                    <Input label="Name" {...register('name')} error={errors.name?.message} />
                    <Textarea label="Description" {...register('description')} error={errors.description?.message} />
                    <div className="flex justify-end gap-2">
                        <Link to="/owner/organizations"><Button type="button" variant="outline">Cancel</Button></Link>
                        <Button type="submit" loading={mutation.isPending}>Create</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
