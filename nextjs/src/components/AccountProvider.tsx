'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';

export type Account = AuthUser & {
  username: string;
  avatarUrl?: string | null;
  devScore?: number | null;
  tier?: string | null;
  competitivePoints?: number;
  competitiveTier?: string;
  duelRating?: number;
};
const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(
  null,
);

function formatAccountError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.problem?.code === 'account_suspended') return 'Account suspended';
    if (error.status === 404) return 'Account profile not found';
    return 'Account unavailable. Try again shortly.';
  }
  const host = process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).host
    : 'localhost:3000';
  return `Unable to connect to backend API server (${host}). Please ensure the backend is running.`;
}

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
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let requestSequence = 0;

    const fetchProfile = async (isRetry = false, background = false) => {
      const request = ++requestSequence;
      try {
        const value = await apiRequest<Account>('/me/profile', {
          signal: controller.signal,
        });
        if (controller.signal.aborted || request !== requestSequence) return;
        if (value.id !== userId) throw new Error('Account could not be loaded');
        setProfile(value);
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted || request !== requestSequence) return;
        if (background) return;
        // If first attempt failed with a network or transient error, retry once automatically after 600ms
        if (!isRetry && !(error instanceof ApiError)) {
          retryTimeout = setTimeout(() => {
            if (!controller.signal.aborted && request === requestSequence) {
              void fetchProfile(true);
            }
          }, 600);
          return;
        }
        setFailure({
          id: userId,
          message: formatAccountError(error),
        });
      }
    };

    void fetchProfile(false);

    const updated = (event: Event) => {
      const value = (event as CustomEvent<Account>).detail;
      if (value?.id === userId) {
        requestSequence++;
        setProfile((previous) =>
          previous?.id === value.id ? { ...previous, ...value } : value,
        );
        setFailure(null);
      }
    };
    window.addEventListener('profile-updated', updated);
    const refreshScore = () => void fetchProfile(false, true);
    window.addEventListener('profile-score-updated', refreshScore);
    return () => {
      controller.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
      window.removeEventListener('profile-updated', updated);
      window.removeEventListener('profile-score-updated', refreshScore);
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
