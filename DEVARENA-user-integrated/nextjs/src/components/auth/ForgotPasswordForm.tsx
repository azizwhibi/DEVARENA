'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { requestPasswordReset } from '@/lib/recovery';
import { TickIcon } from '@/components/arena/TickIcon';

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (sent) statusRef.current?.focus();
  }, [sent]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    setPending(true);
    try {
      await requestPasswordReset(email, window.location.origin);
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  const inputClass =
    'mt-2 min-h-12 w-full rounded-lg border border-zinc-700 bg-[#090C11] px-4 text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
  const linkClass =
    'rounded text-[#C4B5FD] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section
        aria-labelledby="forgot-title"
        className="arena-enter w-full max-w-md rounded-2xl border border-[#252C3A] bg-[#0F141D] p-7 sm:p-10"
      >
        <p className="text-sm font-medium tracking-widest text-[#C4B5FD]">
          DEVARENA
        </p>
        <h1
          id="forgot-title"
          className="mt-3 text-3xl font-semibold tracking-tight"
        >
          Reset your password
        </h1>
        {sent ? (
          <div role="status">
            <div className="mt-4">
              <TickIcon />
            </div>
            <p
              ref={statusRef}
              tabIndex={-1}
              className="mt-4 rounded text-sm leading-6 text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              If an account exists for that email, we’ve sent a link to reset
              your password. Check your spam folder if it doesn’t arrive.
            </p>
            <Link
              href="/login"
              className={`${linkClass} mt-6 inline-flex min-h-11 items-center text-sm`}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Enter your email and we’ll send you a link to reset your password.
            </p>
            <form onSubmit={submit} aria-busy={pending} className="mt-8">
              <fieldset disabled={pending} className="space-y-5">
                <div>
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="arena-btn min-h-12 w-full rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? 'Sending…' : 'Send reset link'}
                </button>
              </fieldset>
            </form>
            <Link
              href="/login"
              className={`${linkClass} mt-6 inline-flex min-h-11 items-center text-sm`}
            >
              Back to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
