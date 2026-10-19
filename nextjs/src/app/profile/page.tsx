import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError } from '@/lib/api-core';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { UserProfileData } from '@/components/profile/ProfileForm';

export const metadata = { title: 'Profile | DevArena' };

async function ProfileContent() {
  await connection();
  let profile: UserProfileData | null = null;
  let shouldRedirectLogin = false;
  try {
    profile = await apiRequest<UserProfileData>('/me/profile');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      shouldRedirectLogin = true;
    } else {
      throw err;
    }
  }
  if (shouldRedirectLogin) {
    redirect('/login?next=/profile');
  }
  if (!profile) return null;
  return <ProfileHeader profile={profile} />;
}

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
            aria-busy="true"
          >
            Loading profile...
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </main>
  );
}
