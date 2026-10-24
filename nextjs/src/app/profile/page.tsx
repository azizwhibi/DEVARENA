export const instant = false;
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
    <section className="mx-auto w-full max-w-[1300px] p-8 max-sm:p-4">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-white/[0.06] bg-[#0F141D] p-8 text-center text-sm text-[#A1AABD]"
            aria-busy="true"
          >
            Loading profile...
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </section>
  );
}
