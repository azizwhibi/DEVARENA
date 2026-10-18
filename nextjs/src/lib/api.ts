'use client';

import { ApiError, request } from '@/lib/api-core';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';

export { ApiError } from '@/lib/api-core';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  let failure: ApiError;
  try {
    return await request<T>(path, data.session?.access_token, init);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    failure = error;
  }
  let refreshedToken: string | undefined;
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error) refreshedToken = data.session?.access_token;
  } catch {
    // A failed refresh cannot authorize the retry.
  }
  if (refreshedToken) {
    try {
      return await request<T>(path, refreshedToken, init);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      failure = error;
    }
  }
  const next = safeNext(window.location.pathname + window.location.search);
  const destination = new URL('/login', window.location.origin);
  destination.searchParams.set('next', next);
  window.location.assign(destination.href);
  throw failure;
}
