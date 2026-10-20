import { MapPin, Landmark } from 'lucide-react';
import Link from 'next/link';
import { getCountryName } from '@/lib/countries';
import type { UserProfileData } from './ProfileForm';

interface ProfileHeaderProps {
  profile: UserProfileData;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const countryName = getCountryName(profile.country);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/[0.06]">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.username}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-3xl font-semibold uppercase text-[#8B93A7]"
                aria-hidden="true"
              >
                {profile.username.charAt(0)}
              </div>
            )}
          </div>

          {/* User Info */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-semibold text-zinc-100">{profile.username}</h1>
              <span className="rounded-full bg-[#151B2B] px-2.5 py-0.5 text-xs font-medium text-[#A6ADBD] border border-white/[0.06]">
                {profile.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  profile.visibility === 'public'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-zinc-800 text-[#8B93A7] border-white/[0.12]'
                }`}
              >
                {profile.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>

            <p className="mt-1 text-sm text-[#8B93A7]">{profile.email}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8B93A7]">
              {countryName && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} strokeWidth={1.5} aria-hidden="true" /> {countryName} ({profile.country})
                </span>
              )}
              {profile.institution && (
                <span className="flex items-center gap-1.5">
                  <Landmark size={16} strokeWidth={1.5} aria-hidden="true" /> {profile.institution}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href="/profile/settings"
            className="inline-flex items-center justify-center rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Edit Settings
          </Link>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Technologies */}
      {profile.technologies.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#8B93A7]">
            Technologies
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {profile.technologies.map((tech) => (
              <span
                key={tech.id}
                className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 border border-white/[0.12]"
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dev Score & Tier Placeholder */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-white/[0.06] pt-4">
        <div className="rounded-lg bg-[#0B0F1A]/40 p-4 border border-white/[0.06]/60">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Dev Score
          </span>
          <div className="mt-1 text-xl font-semibold text-zinc-300">
            {profile.devScore !== null ? profile.devScore : '—'}
          </div>
          <span className="text-xs text-zinc-500">Rankings module preview</span>
        </div>

        <div className="rounded-lg bg-[#0B0F1A]/40 p-4 border border-white/[0.06]/60">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Tier
          </span>
          <div className="mt-1 text-xl font-semibold text-zinc-300">
            {profile.tier !== null ? profile.tier : 'Unranked'}
          </div>
          <span className="text-xs text-zinc-500">Earned via challenge validation</span>
        </div>
      </div>
    </div>
  );
}
