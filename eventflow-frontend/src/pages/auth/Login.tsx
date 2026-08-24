import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { normalizeError } from '@/api/client';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof schema>;

export function Login() {
  const { login } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await login(values);
      // PublicOnly redirects to the right home once auth state updates.
    } catch (e) {
      setErr(normalizeError(e).message);
    }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your EventFlow account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {err && <Alert tone="danger">{err}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-accent-700 hover:text-accent-800">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
