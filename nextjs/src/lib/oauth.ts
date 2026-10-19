import type { Provider } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';

export const OAUTH_PROVIDERS: readonly { id: Provider; label: string }[] = [
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'google', label: 'Continue with Google' },
];

export function getOAuthRedirectUrl(origin: string, next?: string | null): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
}

export async function signInWithProvider(
  provider: Provider,
  origin: string,
  next?: string | null,
): Promise<{ error?: string }> {
  try {
    const redirectTo = getOAuthRedirectUrl(origin, next);
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) return { error: 'Unable to start sign-in with that provider. Try again.' };
    return {};
  } catch {
    return { error: 'Unable to connect. Check your connection and try again.' };
  }
}
