/* eslint-disable @next/next/no-img-element -- Preserve existing profile avatar providers. */
import { EquippedBadge } from '@/components/marketplace/EquippedBadge';
import { MapPin, Landmark, Settings2, Palette } from 'lucide-react';
import Link from 'next/link';
import { getCountryName } from '@/lib/countries';
import type { UserProfileData } from './ProfileForm';
import { ProfileProgress } from './ProfileProgress';
export function ProfileHeader({ profile }: { profile: UserProfileData }) {
  const countryName = getCountryName(profile.country);
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
            <Link href="/marketplace?view=inventory" className="ui-button">
              <Palette size={16} strokeWidth={1.5} aria-hidden="true" />
              Customize
            </Link>
            <Link href="/profile/settings" className="ui-button">
              <Settings2 size={16} strokeWidth={1.5} aria-hidden="true" />
              Edit profile
            </Link>
          </div>
          <div className="profile-name">
            <h1>{profile.username}</h1>
            <EquippedBadge replay />
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
          {profile.technologies.length > 0 && (
            <div className="profile-technologies">
              {profile.technologies.map((t) => (
                <span className="badge" key={t.id}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
          {(profile.devScore !== null || profile.tier !== null) && (
            <div className="profile-verified-values">
              {profile.devScore !== null && (
                <span>Dev Score: {profile.devScore}</span>
              )}
              {profile.tier !== null && <span>Tier: {profile.tier}</span>}
            </div>
          )}
        </div>
      </section>
      <ProfileProgress createdAt={profile.createdAt} />
    </div>
  );
}
