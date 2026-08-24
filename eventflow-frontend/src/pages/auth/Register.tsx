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
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
type Values = z.infer<typeof schema>;

export function Register() {
  const { register: registerUser } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await registerUser(values);
      // PublicOnly redirects once the session is established.
    } catch (e) {
      setErr(normalizeError(e).message);
    }
  });

  return (
    <AuthShell title="Create your account" subtitle="Start managing events in minutes">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {err && <Alert tone="danger">{err}</Alert>}
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-700 hover:text-accent-800">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
