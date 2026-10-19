import 'server-only';
import { connection } from 'next/server';
import { ApiError, request } from '@/lib/api-core';
import { createClient } from '@/lib/supabase/server';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  const token = error ? undefined : data.session?.access_token;
  try {
    return await request<T>(path, token, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData.session?.access_token) {
          return await request<T>(path, refreshData.session.access_token, init);
        }
      } catch {
        // Refresh failed; caller handles 401.
      }
    }
    throw err;
  }
}
