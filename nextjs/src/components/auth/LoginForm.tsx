'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';
import { DEMO_ACCOUNTS, resolveRoleDestination } from '@/lib/role-login';
import { OAuthButtons } from './OAuthButtons';

export function LoginForm({
  next,
  callbackFailed,
}: {
  next: string;
  callbackFailed: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function loginWithCredentials(loginEmail: string, loginPass: string) {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { error: authError } = await createClient().auth.signInWithPassword(
        {
          email: loginEmail.trim(),
          password: loginPass,
        },
      );
      if (authError) {
        setError(
          'Unable to sign in. Check your email and password and try again.',
        );
        return;
      }

      const destination = await resolveRoleDestination(next, async () => {
        const me = await apiRequest<AuthUser>('/me');
        return me.role;
      });

      router.replace(destination);
      router.refresh();
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWithCredentials(email, password);
  }

  async function handleDemoLogin(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    await loginWithCredentials(demoEmail, demoPass);
  }

  const message =
    error ||
    (callbackFailed
      ? 'This sign-in link could not be verified. Sign in below or request a new link.'
      : '');
  const inputClass =
    'mt-2 min-h-12 w-full rounded-lg border border-zinc-700 bg-[#090C11] px-4 text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
  const linkClass =
    'rounded text-[#C4B5FD] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section
        aria-labelledby="login-title"
        className="arena-enter w-full max-w-md rounded-2xl border border-[#252C3A] bg-[#0F141D] p-7 sm:p-10"
      >
        <p className="text-sm font-medium tracking-widest text-[#C4B5FD]">
          DEVARENA
        </p>
        <h1
          id="login-title"
          className="mt-3 text-3xl font-semibold tracking-tight"
        >
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Continue to your workspace.
        </p>

        {/* Quick Demo Access Buttons */}
        <div className="mt-6 rounded-xl border border-[#252C3A] bg-[#090C11] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Demo accounts
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.role}
                type="button"
                disabled={pending}
                onClick={() => handleDemoLogin(demo.email, demo.password)}
                className="flex flex-col items-start rounded-lg border border-[#252C3A] bg-[#0F141D] p-2.5 text-left transition hover:border-primary hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <span className="text-xs font-bold text-zinc-200 capitalize">
                  {demo.role === 'admin'
                    ? 'Admin'
                    : demo.role === 'recruiter'
                      ? 'Recruiter'
                      : 'Developer'}
                </span>
                <span className="mt-0.5 text-[11px] text-zinc-400 truncate w-full">
                  {demo.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        <OAuthButtons next={next} />

        <form onSubmit={submit} aria-busy={pending} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              maxLength={254}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>
          {message && (
            <p
              role="alert"
              className="rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm leading-6 text-red-200"
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="arena-btn min-h-12 w-full rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
          <Link href="/forgot-password" className={linkClass}>
            Forgot password?
          </Link>
          <Link href="/register" className={linkClass}>
            Create an account
          </Link>
        </div>
      </section>
    </main>
  );
}
