import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { safeNext } from '@/lib/safe-next';

const emailTypes: readonly string[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const providerError = url.searchParams.get('error') ?? url.searchParams.get('error_description');

  if (providerError) {
    console.error('OAuth provider error in callback:', providerError, url.searchParams.get('error_description'));
  }

  let success = false;
  const cookieStore = await cookies();
  type CookieOptions = Parameters<typeof cookieStore.set>[2];
  const cookiesToSetLater: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              cookiesToSetLater.push({ name, value, options });
            });
          } catch {
            // Server Components have read-only cookies; proxy.ts persists refreshes.
          }
        },
      },
    },
  );

  if (code || (tokenHash && type && emailTypes.includes(type))) {
    try {
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as EmailOtpType });

      if (error) {
        console.error('Auth callback verification failed:', error.message);
        // Fallback: If code was already exchanged or session is already active in cookies
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          success = true;
        }
      } else {
        success = true;
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data?.session) {
        success = true;
      }
    }
  }

  const defaultNext = type === 'recovery' ? '/reset-password' : '/';
  const destination = success ? safeNext(url.searchParams.get('next') ?? defaultNext) : '/login?error=callback_failed';
  const response = NextResponse.redirect(new URL(destination, url.origin));

  // Explicitly set all cookies on the redirect response headers so the browser persists them
  cookiesToSetLater.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
