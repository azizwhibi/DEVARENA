'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { register } from '@/lib/register';

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const confirmation = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sent) confirmation.current?.focus();
  }, [sent]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    setPending(true);
    setError('');
    try {
      const result = await register(form, window.location.origin);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      element.reset();
      if (result.signedIn) {
        router.replace('/');
        router.refresh();
      } else {
        setSent(true);
      }
    } finally {
      setPending(false);
    }
  }

  const inputClass = 'mt-2 min-h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-zinc-100 outline-none focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400';
  const linkClass = 'rounded text-emerald-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400';

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section aria-labelledby="register-title" className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-7 sm:p-10">
        <p className="text-sm font-medium tracking-widest text-emerald-300">DEVARENA</p>
        {sent ? (
          <div role="status">
            <h1 id="register-title" ref={confirmation} tabIndex={-1} className="mt-3 rounded text-3xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">Check your inbox</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-300">If registration can be completed, you’ll receive an email with a confirmation link. Open it to finish creating your account.</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Check your spam folder if it hasn’t arrived. Already have an account? Sign in below.</p>
            <Link href="/login" className={`${linkClass} mt-6 inline-flex min-h-11 items-center`}>Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 id="register-title" className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Join DevArena and start building your skills.</p>
            <form onSubmit={submit} aria-busy={pending} className="mt-8">
              <fieldset disabled={pending} className="space-y-5">
                <legend className="sr-only">Account details</legend>
                <div>
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="username" className="text-sm font-medium">Username</label>
                  <input id="username" name="username" type="text" autoComplete="nickname" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" aria-describedby="username-hint" className={inputClass} />
                  <p id="username-hint" className="mt-2 text-xs leading-5 text-zinc-400">3–24 letters, numbers or underscores. If taken, we’ll choose an available variation.</p>
                </div>
                <div>
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-hint" className={inputClass} />
                  <p id="password-hint" className="mt-2 text-xs leading-5 text-zinc-400">Use at least eight characters.</p>
                </div>
                <label htmlFor="visibility" className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-6">
                  <input id="visibility" name="visibility" type="checkbox" defaultChecked aria-describedby="visibility-hint" className="mt-1 h-5 w-5 shrink-0 accent-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400" />
                  <span>Show me on public leaderboards<span id="visibility-hint" className="mt-1 block text-xs leading-5 text-zinc-400">Uncheck to keep your profile private. You can change this later.</span></span>
                </label>
                {error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm leading-6 text-red-200">{error}</p>}
                <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-emerald-300 px-4 font-semibold text-zinc-950 hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60">{pending ? 'Creating account…' : 'Create account'}</button>
              </fieldset>
            </form>
            <p className="mt-6 text-sm text-zinc-400">Already have an account? <Link href="/login" className={`${linkClass} inline-flex min-h-11 items-center`}>Sign in</Link></p>
          </>
        )}
      </section>
    </main>
  );
}
