import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

const emailTypes: readonly string[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  let success = false;
  if (code || (tokenHash && type && emailTypes.includes(type))) {
    try {
      const supabase = await createClient();
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as EmailOtpType });
      success = !error;
    } catch {
      // Keep credentials and provider errors out of the redirect URL.
    }
  }
  const destination = success ? safeNext(url.searchParams.get('next')) : '/login?error=callback_failed';
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
