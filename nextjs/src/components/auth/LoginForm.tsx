'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';
import { OAuthButtons } from './OAuthButtons';

export function LoginForm({ next, callbackFailed }: { next: string; callbackFailed: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      if (error) {
        setError('Unable to sign in. Check your email and password and try again.');
        return;
      }
      router.replace(safeNext(next));
      router.refresh();
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  const message = error || (callbackFailed
    ? 'This sign-in link could not be verified. Sign in below or request a new link.' : '');
  const inputClass = 'mt-2 min-h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
  const linkClass = 'rounded text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section aria-labelledby="login-title" className="arena-enter w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-7 sm:p-10">
        <p className="text-sm font-medium tracking-widest text-primary">DEVARENA</p>
        <h1 id="login-title" className="mt-3 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Sign in to continue your development journey.</p>
        <OAuthButtons next={next} />
        <form onSubmit={submit} aria-busy={pending} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
          </div>
          {message && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm leading-6 text-red-200">{message}</p>}
          <button type="submit" disabled={pending} className="arena-btn min-h-12 w-full rounded-lg bg-primary px-4 font-semibold text-zinc-950 hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
          <Link href="/forgot-password" className={linkClass}>Forgot password?</Link>
          <Link href="/register" className={linkClass}>Create an account</Link>
        </div>
      </section>
    </main>
  );
}
