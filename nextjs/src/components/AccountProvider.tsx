'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';

export type Account = AuthUser & { username: string; avatarUrl?: string | null };
const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(
  null,
);

function useAccountState() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [profile, setProfile] = useState<Account | null>(null);
  const [failure, setFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void apiRequest<Account>('/me/profile', { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (value.id !== userId) throw new Error('Account could not be loaded');
        setProfile(value);
        setFailure(null);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFailure({
            id: userId,
            message:
              error instanceof ApiError &&
              error.problem.code === 'account_suspended'
                ? 'Account suspended'
                : 'Account unavailable. Try again shortly.',
          });
      });
    const updated = (event: Event) => {
      const value = (event as CustomEvent<Account>).detail;
      if (value?.id === userId) {
        setProfile((previous) =>
          previous?.id === value.id ? { ...previous, ...value } : value,
        );
        setFailure(null);
      }
    };
    window.addEventListener('profile-updated', updated);
    return () => {
      controller.abort();
      window.removeEventListener('profile-updated', updated);
    };
  }, [userId, retryKey]);
  return {
    ...auth,
    account: userId && profile?.id === userId && failure?.id !== userId ? profile : null,
    failure: userId && failure?.id === userId ? failure.message : '',
    retry: () => {
      setFailure(null);
      setRetryKey((key) => key + 1);
    },
  };
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const value = useAccountState();
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('Account provider is unavailable');
  return value;
}
