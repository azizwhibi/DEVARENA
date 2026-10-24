'use client';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/lib/api-core';
import { DevGuide } from './DevGuide';

// Uses the workspace account; no duplicate profile request or independent auth flow.
export function DevGuideProvider({ account }: { account: AuthUser }) {
  const { user } = useAuth();
  if (account.role !== 'developer' || !user || user.id !== account.id) return null;
  // Remounting drops all in-memory tutorial state on logout/account switches.
  return <DevGuide key={user.id} userId={user.id} />;
}
