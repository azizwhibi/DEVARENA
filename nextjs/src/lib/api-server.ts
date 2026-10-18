import 'server-only';
import { request } from '@/lib/api-core';
import { createClient } from '@/lib/supabase/server';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  // Nest verifies this token and reloads the profile; no claims are trusted here.
  return request<T>(path, error ? undefined : data.session?.access_token, init);
}
