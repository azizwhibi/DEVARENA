'use client';

import { createClient } from '@/lib/supabase/client';

export async function register(form: FormData, origin: string): Promise<{ error: string } | { signedIn: boolean }> {
  const emailValue = form.get('email');
  const username = form.get('username');
  const password = form.get('password');
  const email = typeof emailValue === 'string' ? emailValue.trim() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (typeof username !== 'string' || username.length < 3 || username.length > 24 || /[^A-Za-z0-9_]/.test(username)) {
    return { error: 'Choose a username with 3–24 letters, numbers or underscores.' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Use a password with at least eight characters.' };
  }
  try {
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL('/auth/callback', origin).href,
        data: { username, visibility: form.get('visibility') === 'on' ? 'public' : 'private' },
      },
    });
    if (error) {
      // Match the provider's neutral success response for existing accounts.
      if (error.code === 'user_already_exists') return { signedIn: false };
      if (error.status === 429) return { error: 'Please wait before trying to register again.' };
      if (error.code === 'weak_password') return { error: 'Choose a stronger password and try again.' };
      return { error: 'Unable to register. Check your details and try again.' };
    }
    // Normally null with confirmation enabled; handle the provider's session honestly.
    return { signedIn: Boolean(data.session) };
  } catch {
    return { error: 'Unable to connect. Check your connection and try again.' };
  }
}
