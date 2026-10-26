'use client';

import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearOfflineReading } from '@/lib/offline-reading';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // INITIAL_SESSION initializes state; subsequent events include cross-tab logout.
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await clearOfflineReading().catch(() => {});
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
    router.replace('/login');
    router.refresh();
  }, [router]);

  return { user, loading, signOut };
}
