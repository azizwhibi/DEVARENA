'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { updatePassword } from '@/lib/recovery';

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    setPending(true);
    setError('');
    try {
      const result = await updatePassword(password, confirmPassword);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.replace('/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const inputClass = 'mt-2 min-h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
  const linkClass = 'rounded text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section aria-labelledby="reset-title" className="arena-enter w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-7 sm:p-10">
        <p className="text-sm font-medium tracking-widest text-primary">DEVARENA</p>
        <h1 id="reset-title" className="mt-3 text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Enter and confirm your new password below.</p>
        <form onSubmit={submit} aria-busy={pending} className="mt-8">
          <fieldset disabled={pending} className="space-y-5">
            <div>
              <label htmlFor="password" className="text-sm font-medium">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-hint" className={inputClass} />
              <p id="password-hint" className="mt-2 text-xs leading-5 text-zinc-400">Use at least eight characters.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm leading-6 text-red-200">{error}</p>}
            <button type="submit" disabled={pending} className="arena-btn min-h-12 w-full rounded-lg bg-primary px-4 font-semibold text-zinc-950 hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">{pending ? 'Saving…' : 'Update password'}</button>
          </fieldset>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
          <Link href="/forgot-password" className={linkClass}>Request new link</Link>
          <Link href="/login" className={linkClass}>Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
