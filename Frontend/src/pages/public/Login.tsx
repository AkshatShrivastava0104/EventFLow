import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  Mail,
  Lock,
  Ticket as TicketIcon,
  ArrowRight,
} from 'lucide-react';

import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

import api, { setTokens } from '../../lib/api';

import { signInWithGoogle } from '../../lib/googleAuth';

import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

interface RegisterResponse {
  message?: string;
  user?: {
    id: number;
    name?: string;
    email?: string;
  };
}


export function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;

  const { refreshUser } = useAuth();

  const [email, setEmail] =
    useState('demo@eventflow.io');

  const [password, setPassword] =
    useState('password123');

  const [loading, setLoading] =
    useState(false);

  const [err, setErr] =
    useState<string | null>(null);


  const onSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErr(null);
    setLoading(true);

    try {
      /*
       * 1. Login
       */
      const response =
        await api.post<AuthResponse>(
          '/auth/login',
          {
            email,
            password,
          }
        );


      /*
       * 2. Get tokens
       */
      const {
        access_token,
        refresh_token,
      } = response.data;


      /*
       * 3. Validate response
       */
      if (
        !access_token ||
        !refresh_token
      ) {
        throw new Error(
          'Invalid login response from server'
        );
      }


      /*
       * 4. Store tokens
       */
      setTokens(
        access_token,
        refresh_token
      );


      /*
       * 5. IMPORTANT:
       *
       * Update AuthContext immediately.
       *
       * Without this, React still thinks:
       *
       * user = null
       *
       * until the page is refreshed.
       */
      await refreshUser();


      /*
       * 6. Show success message
       */
      toast.success(
        'Welcome back!'
      );


      /*
       * 7. Navigate
       */
      nav(
        loc.state?.from || '/'
      );

    } catch (error: any) {

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to sign in';

      setErr(message);

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">

      <div className="flex items-center justify-center p-6 sm:p-10">

        <div className="w-full max-w-sm">

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white">

              <TicketIcon className="h-4 w-4" />

            </div>

            <span className="font-display text-lg font-bold">
              EventFlow
            </span>

          </div>


          <h1 className="font-display mt-8 text-3xl font-semibold">
            Welcome back
          </h1>


          <p className="mt-1 text-sm text-ink-500">
            Sign in to access your tickets and dashboard.
          </p>


          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4"
          >

            <Input
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />


            <Input
              label="Password"
              icon={<Lock className="h-4 w-4" />}
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />


            {err && (
              <p className="text-sm text-red-600">
                {err}
              </p>
            )}


            <div className="flex items-center justify-between text-xs">

              <label className="flex items-center gap-2 text-ink-600">

                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                />

                Remember me

              </label>


              <Link
                to="/forgot-password"
                className="font-semibold text-brand-600 hover:underline"
              >
                Forgot password?
              </Link>

            </div>


            <Button
              type="submit"
              full
              size="lg"
              loading={loading}
              rightIcon={
                <ArrowRight className="h-4 w-4" />
              }
            >
              Sign in
            </Button>

          </form>


          <div className="my-4 flex items-center gap-3 text-xs text-ink-400">

            <span className="h-px flex-1 bg-ink-200" />

            or

            <span className="h-px flex-1 bg-ink-200" />

          </div>


          <Button
            variant="outline"
            full
            size="lg"
            onClick={() =>
              signInWithGoogle()
            }
          >

            <svg
              className="h-4 w-4"
              viewBox="0 0 48 48"
            >

              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.5 30.1.5 24 .5 14.9.5 7 5.7 3.3 13.2l7.8 6.1C13 13.6 18 9.5 24 9.5z"
              />

              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4 7.1-10 7.1-17.6z"
              />

              <path
                fill="#FBBC05"
                d="M11.1 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C1.7 16.4.5 20 .5 24s1.2 7.6 3.3 10.7l7.3-6.1z"
              />

              <path
                fill="#34A853"
                d="M24 47.5c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6 0-11-4.1-13-9.7l-7.3 6.1C7 42.3 14.9 47.5 24 47.5z"
              />

            </svg>

            Continue with Google

          </Button>


          <p className="mt-6 text-center text-sm text-ink-500">

            New here?{' '}

            <Link
              to="/register"
              className="font-semibold text-brand-600"
            >
              Create an account
            </Link>

          </p>

        </div>

      </div>


      <AuthSide />

    </div>
  );
}


export function Register() {

  const nav = useNavigate();

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [err, setErr] =
    useState<string | null>(null);


  const onSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setErr(null);
    setLoading(true);

    try {

      await api.post<RegisterResponse>(
        '/auth/register',
        {
          name,
          email,
          password,
        }
      );

      toast.success(
        'Account created! You can now sign in.'
      );

      nav('/login');

    } catch (error: any) {

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create account';

      setErr(message);

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">

      <div className="flex items-center justify-center p-6 sm:p-10">

        <div className="w-full max-w-sm">

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white">

              <TicketIcon className="h-4 w-4" />

            </div>

            <span className="font-display text-lg font-bold">
              EventFlow
            </span>

          </div>


          <h1 className="font-display mt-8 text-3xl font-semibold">
            Create your account
          </h1>


          <p className="mt-1 text-sm text-ink-500">
            Join EventFlow to discover and manage events.
          </p>


          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4"
          >

            <Input
              label="Full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Alex Ramirez"
              required
            />


            <Input
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />


            <Input
              label="Password"
              icon={<Lock className="h-4 w-4" />}
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
              hint="At least 6 characters"
            />


            {err && (
              <p className="text-sm text-red-600">
                {err}
              </p>
            )}


            <Button
              type="submit"
              full
              size="lg"
              loading={loading}
              rightIcon={
                <ArrowRight className="h-4 w-4" />
              }
            >
              Create account
            </Button>

          </form>


          <div className="my-4 flex items-center gap-3 text-xs text-ink-400">

            <span className="h-px flex-1 bg-ink-200" />

            or

            <span className="h-px flex-1 bg-ink-200" />

          </div>


          <Button
            variant="outline"
            full
            size="lg"
            onClick={() =>
              signInWithGoogle()
            }
          >

            <svg
              className="h-4 w-4"
              viewBox="0 0 48 48"
            >

              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.5 30.1.5 24 .5 14.9.5 7 5.7 3.3 13.2l7.8 6.1C13 13.6 18 9.5 24 9.5z"
              />

              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4 7.1-10 7.1-17.6z"
              />

              <path
                fill="#FBBC05"
                d="M11.1 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C1.7 16.4.5 20 .5 24s1.2 7.6 3.3 10.7l7.3-6.1z"
              />

              <path
                fill="#34A853"
                d="M24 47.5c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6 0-11-4.1-13-9.7l-7.3 6.1C7 42.3 14.9 47.5 24 47.5z"
              />

            </svg>

            Continue with Google

          </Button>


          <p className="mt-6 text-center text-sm text-ink-500">

            Already have an account?{' '}

            <Link
              to="/login"
              className="font-semibold text-brand-600"
            >
              Sign in
            </Link>

          </p>

        </div>

      </div>


      <AuthSide />

    </div>
  );
}


export function ForgotPassword() {

  const [email, setEmail] =
    useState('');

  const [sent, setSent] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [err, setErr] =
    useState<string | null>(null);


  const onSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setErr(null);
    setLoading(true);

    try {

      toast(
        'Password reset API is not connected yet.',
        {
          icon: 'ℹ️',
        }
      );

      setSent(false);

    } catch (error: any) {

      setErr(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Unable to request password reset'
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">

      <div className="flex items-center justify-center p-6 sm:p-10">

        <div className="w-full max-w-sm">

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white">

              <TicketIcon className="h-4 w-4" />

            </div>

            <span className="font-display text-lg font-bold">
              EventFlow
            </span>

          </div>


          <h1 className="font-display mt-8 text-3xl font-semibold">
            Reset your password
          </h1>


          <p className="mt-1 text-sm text-ink-500">
            We'll help you recover access to your account.
          </p>


          {sent ? (

            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">

              Check your inbox! We sent a reset link to{' '}

              <strong>
                {email}
              </strong>

            </div>

          ) : (

            <form
              onSubmit={onSubmit}
              className="mt-6 space-y-4"
            >

              <Input
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />


              {err && (
                <p className="text-sm text-red-600">
                  {err}
                </p>
              )}


              <Button
                type="submit"
                full
                size="lg"
                loading={loading}
              >
                Send reset link
              </Button>

            </form>

          )}


          <p className="mt-6 text-center text-sm text-ink-500">

            <Link
              to="/login"
              className="font-semibold text-brand-600"
            >
              ← Back to sign in
            </Link>

          </p>

        </div>

      </div>


      <AuthSide />

    </div>
  );
}


function AuthSide() {
  return (
    <div className="relative hidden lg:block">

      <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-950 to-brand-900" />

      <div className="absolute inset-0 bg-grid-dark opacity-30" />

      <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />

      <div className="absolute -left-24 bottom-1/4 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />


      <div className="relative flex h-full flex-col justify-between p-12 text-white">

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs backdrop-blur">

          <TicketIcon className="h-3.5 w-3.5" />

          Trusted by 4,200+ organizers

        </div>


        <div>

          <p className="font-display text-4xl font-semibold leading-tight">

            "EventFlow cut our door-check time by 70%. Our staff love the QR scanner."

          </p>


          <div className="mt-6 flex items-center gap-3">

            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-400 to-sky-400" />

            <div>

              <p className="text-sm font-semibold">
                Priya Menon
              </p>

              <p className="text-xs text-ink-300">
                Director of Ops, Northwind Music Festival
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}