import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError } from '@/lib/api-core';
import { ProfileForm, UserProfileData } from '@/components/profile/ProfileForm';

export const metadata = { title: 'Profile Settings | DevArena' };

async function SettingsContent() {
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
    redirect('/login?next=/profile/settings');
  }
  if (!profile) return null;
  return <ProfileForm key={profile.id} initialProfile={profile} />;
}

export default function ProfileSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-zinc-100">Profile Settings</h1>
          <p className="text-sm text-[#8B93A7]">
            Manage your personal details, public profile, and account settings.
          </p>
        </div>
        <Link
          href="/profile"
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          View Profile
        </Link>
      </div>

      <Suspense
        fallback={
          <div
            className="rounded-xl border border-white/[0.06] bg-[#111827] p-8 text-center text-sm text-[#8B93A7]"
            aria-busy="true"
          >
            Loading settings...
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </main>
  );
}
