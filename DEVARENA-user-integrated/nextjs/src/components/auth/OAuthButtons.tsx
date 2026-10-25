'use client';

import { useState } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { OAUTH_PROVIDERS, signInWithProvider } from '@/lib/oauth';

const icons: Partial<Record<Provider, React.ReactNode>> = {
  github: (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 fill-current"
    >
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.36 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.34a12 12 0 0 0 0 10.82l4.02-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44A12 12 0 0 0 1.34 6.59l4.02 3.1A7.2 7.2 0 0 1 12 4.75Z"
      />
    </svg>
  ),
};

export function OAuthButtons({ next = '/' }: { next?: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  async function start(provider: Provider) {
    if (pending) return;
    setPending(provider);
    setError('');
    const result = await signInWithProvider(
      provider,
      window.location.origin,
      next,
    );
    if (result.error) {
      setError(result.error);
      setPending(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="space-y-3">
        {OAUTH_PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            disabled={pending !== null}
            onClick={() => start(id)}
            className="min-h-12 w-full rounded-lg border border-zinc-700 px-4 font-semibold hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-3">
              {icons[id]}
              {pending === id ? 'Connecting…' : label}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      )}
      <p className="mt-6 text-center text-xs uppercase tracking-widest text-[#A1AABD]">
        or use email
      </p>
    </div>
  );
}
