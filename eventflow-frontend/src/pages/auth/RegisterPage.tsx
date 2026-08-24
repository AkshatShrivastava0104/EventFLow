import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';

const schema = z.object({
    name: z.string().min(2, 'Name is too short'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
    organization_name: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function RegisterPage() {
    const { register: registerUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', email: '', password: '', organization_name: '' },
    });

    const onSubmit = async (v: Values) => {
        setLoading(true);
        try {
            await registerUser(v);
            toast.success('Account created.');
            navigate('/');
        } catch (e) {
            toast.error(normalizeError(e).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-xl font-semibold text-ink-900">Create your account</h1>
                    <p className="mt-1 text-sm text-ink-500">Start running events in minutes.</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6">
                    <Input label="Full name" {...register('name')} error={errors.name?.message} />
                    <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
                    <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
                    <Input label="Organization name (optional)" {...register('organization_name')} error={errors.organization_name?.message} />
                    <Button type="submit" loading={loading} className="w-full">Create account</Button>
                    <p className="text-center text-sm text-ink-500">
                        Already registered?{' '}
                        <Link to="/login" className="font-medium text-ink-900 underline-offset-4 hover:underline">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
