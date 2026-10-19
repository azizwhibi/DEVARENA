import { createClient } from '@/lib/supabase/client';

export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;
  try {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/auth/callback`,
    });
  } catch {
    // Suppress errors to avoid account enumeration
  }
}

export type UpdatePasswordResult = { success: true } | { error: string };

export async function updatePassword(password: string, confirmPassword: string): Promise<UpdatePasswordResult> {
  if (password.length < 8) {
    return { error: 'Password must be at least eight characters.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === 'weak_password') return { error: 'Choose a stronger password and try again.' };
      if (error.status === 429) return { error: 'Please wait before trying to update your password again.' };
      return { error: 'Unable to update your password. The link may have expired; request a new one.' };
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal: session cookies will expire or be overwritten upon sign-in
    }
    return { success: true };
  } catch {
    return { error: 'Unable to connect. Check your connection and try again.' };
  }
}
