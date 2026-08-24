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
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (v: Values) => {
        setLoading(true);
        try {
            await login(v);
            toast.success('Welcome back!');
            navigate('/');
        } catch (e) {
            const err = normalizeError(e);
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded bg-ink-900 font-bold text-white">E</div>
                    <h1 className="text-xl font-semibold text-ink-900">Sign in to EventFlow</h1>
                    <p className="mt-1 text-sm text-ink-500">Manage events, registrations and tickets.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6">
                    <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
                    <Input label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
                    <Button type="submit" loading={loading} className="w-full">Sign in</Button>
                    <p className="text-center text-sm text-ink-500">
                        Don’t have an account?{' '}
                        <Link to="/register" className="font-medium text-ink-900 underline-offset-4 hover:underline">
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
