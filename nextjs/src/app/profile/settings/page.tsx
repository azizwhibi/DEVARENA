import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiRequest } from '@/lib/api-server';
import { ApiError } from '@/lib/api-core';
import { ProfileForm, UserProfileData } from '@/components/profile/ProfileForm';

export const metadata = { title: 'Profile Settings | DevArena' };

async function SettingsContent() {
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
  return <ProfileForm initialProfile={profile} />;
}

export default function ProfileSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Profile Settings</h1>
          <p className="text-sm text-zinc-400">
            Manage your personal details, public profile, and account settings.
          </p>
        </div>
        <Link
          href="/profile"
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          View Profile
        </Link>
      </div>

      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
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
