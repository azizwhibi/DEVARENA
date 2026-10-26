/* eslint-disable @next/next/no-img-element -- Preserve existing profile avatar providers. */
import { EquippedBadge } from '@/components/marketplace/EquippedBadge';
import { MapPin, Landmark, Settings2, Palette } from 'lucide-react';
import Link from 'next/link';
import { getCountryName } from '@/lib/countries';
import type { UserProfileData } from './ProfileForm';
import { ProfileProgress } from './ProfileProgress';
export function ProfileHeader({ profile }: { profile: UserProfileData }) {
  const countryName = getCountryName(profile.country);
  const isDeveloper = profile.role === 'developer';
  const isAdmin = profile.role === 'admin';
  const isRecruiter = profile.role === 'recruiter';
  return (
    <div className="profile-overview">
      <section className="profile-identity">
        <div className="profile-banner" aria-hidden="true" />
        <div className="profile-identity-body">
          <div className="profile-avatar">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username + "'s avatar"}
              />
            ) : (
              <span aria-hidden="true">{profile.username.slice(0, 2)}</span>
            )}
          </div>
          <div className="profile-actions">
            {isDeveloper && (
              <Link href="/marketplace?view=inventory" className="ui-button">
                <Palette size={16} strokeWidth={1.5} aria-hidden="true" />
                Customize
              </Link>
            )}
            <Link href="/profile/settings" className="ui-button">
              <Settings2 size={16} strokeWidth={1.5} aria-hidden="true" />
              Edit profile
            </Link>
          </div>
          <div className="profile-name">
            <h1>{profile.username}</h1>
            {isDeveloper && <EquippedBadge replay />}
            <span className="badge">{profile.role}</span>
            <span className="badge">
              {profile.visibility === 'public' ? 'Public' : 'Private'}
            </span>
          </div>
          <p className="profile-email">{profile.email}</p>
          <div className="profile-location">
            {countryName && (
              <span>
                <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
                {countryName}
              </span>
            )}
            {profile.institution && (
              <span>
                <Landmark size={16} strokeWidth={1.5} aria-hidden="true" />
                {profile.institution}
              </span>
            )}
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          {isDeveloper && profile.competitivePoints != null && (
            <div className="profile-verified-values">
              <span>Competitive points: {profile.competitivePoints}</span>
              <span>Competitive tier: {profile.competitiveTier}</span>
              <span>Duel rating: {profile.duelRating}</span>
            </div>
          )}
          {isDeveloper && profile.technologies.length > 0 && (
            <div className="profile-technologies">
              {profile.technologies.map((t) => (
                <span className="badge" key={t.id}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
          {isDeveloper && (profile.devScore !== null || profile.tier !== null) && (
            <div className="profile-verified-values">
              {profile.devScore !== null && (
                <span>Dev Score: {profile.devScore}</span>
              )}
              {profile.tier !== null && <span>Tier: {profile.tier}</span>}
            </div>
          )}
        </div>
      </section>
      {isDeveloper && <ProfileProgress createdAt={profile.createdAt} />}
      {isRecruiter && (
        <div className="profile-panels">
          <section className="ui-card">
            <h2 className="ui-label">Recruiter Talent Hub</h2>
            <p className="text-xs text-[#A1AABD] mt-1 mb-4">
              Search for developer talent, filter by tech stack or school, and send direct interview requests.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/recruiter" className="ui-button">
                Candidate hub
              </Link>
              <Link href="/invitations" className="ui-button">
                Interview requests
              </Link>
              <Link href="/messages" className="ui-button">
                Live messages
              </Link>
            </div>
          </section>
        </div>
      )}
      {isAdmin && (
        <div className="profile-panels">
          <section className="ui-card">
            <h2 className="ui-label">Administration & Moderation</h2>
            <p className="text-xs text-[#A1AABD] mt-1 mb-4">
              Manage platform users, roles, skill taxonomies, and learning resources.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/users" className="ui-button">
                Manage users
              </Link>
              <Link href="/admin/skills" className="ui-button">
                Skill management
              </Link>
              <Link href="/admin/knowledge" className="ui-button">
                Knowledge base
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
