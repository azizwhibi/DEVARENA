import Link from 'next/link';
import { getCountryName } from '@/lib/countries';
import type { UserProfileData } from './ProfileForm';

interface ProfileHeaderProps {
  profile: UserProfileData;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const countryName = getCountryName(profile.country);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-zinc-700">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.username}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-3xl font-bold uppercase text-zinc-400"
                aria-hidden="true"
              >
                {profile.username.charAt(0)}
              </div>
            )}
          </div>

          {/* User Info */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">{profile.username}</h1>
              <span className="rounded-full bg-indigo-950/80 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-800">
                {profile.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  profile.visibility === 'public'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {profile.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-400">{profile.email}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              {countryName && (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true">📍</span> {countryName} ({profile.country})
                </span>
              )}
              {profile.institution && (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true">🏛️</span> {profile.institution}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href="/profile/settings"
            className="inline-flex items-center justify-center rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Edit Settings
          </Link>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Developer Skills & Technologies */}
      {profile.role === 'developer' && (
        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Skills & Technologies
            </h2>
            <Link
              href="/profile/settings"
              className="text-xs text-primary hover:underline"
            >
              Edit skills
            </Link>
          </div>
          {profile.technologies.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profile.technologies.map((tech) => (
                <span
                  key={tech.id}
                  className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5"
                >
                  <span className="text-primary text-[11px]">✓</span> {tech.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2.5 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-center">
              <p className="text-xs text-zinc-400">
                No skills selected yet. Choose your technologies in settings so recruiters can find you.
              </p>
              <Link
                href="/profile/settings"
                className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline"
              >
                Choose skills in Settings →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recruiter Workspace Info (Recruiters do not have a Dev Score or Tier) */}
      {profile.role === 'recruiter' && (
        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-950/80 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-800">
                    👔 Recruiter Account
                  </span>
                  <span className="text-xs text-zinc-500">Talent Discovery Access</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  {profile.institution
                    ? `Representing ${profile.institution}`
                    : 'Independent Talent Scout'}{' '}
                  · Active candidate search and live direct messaging enabled.
                </p>
              </div>
              <Link
                href="/recruiter"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary shrink-0"
              >
                Search Candidates →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dev Score & Tier Placeholder (Exclusively for Developers) */}
      {profile.role === 'developer' && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-zinc-800/80 pt-4">
          <div className="rounded-lg bg-zinc-950/40 p-4 border border-zinc-800/60">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Dev Score
            </span>
            <div className="mt-1 text-xl font-bold text-zinc-300">
              {profile.devScore !== null ? profile.devScore : '—'}
            </div>
            <span className="text-xs text-zinc-500">Rankings module preview</span>
          </div>

          <div className="rounded-lg bg-zinc-950/40 p-4 border border-zinc-800/60">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Tier
            </span>
            <div className="mt-1 text-xl font-bold text-zinc-300">
              {profile.tier !== null ? profile.tier : 'Unranked'}
            </div>
            <span className="text-xs text-zinc-500">Earned via challenge validation</span>
          </div>
        </div>
      )}
    </div>
  );
}
