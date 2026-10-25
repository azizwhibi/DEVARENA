'use client';

import { useState, useEffect, useId, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, ApiError } from '@/lib/api';
import { PRESET_INSTITUTIONS } from '@/lib/institutions';
import { getCountryOptions } from '@/lib/countries';
import { AvatarUpload } from './AvatarUpload';
import { DangerZone } from './DangerZone';

export interface UserProfileData {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  institution: string | null;
  technologies: { id: string; name: string }[];
  visibility: 'public' | 'private';
  createdAt: string;
  devScore: number | null;
  tier: string | null;
}

interface TechnologyOption {
  id: string;
  name: string;
}

const DEFAULT_TECHNOLOGIES: TechnologyOption[] = [
  { id: 'a0000000-0000-4000-8000-000000000001', name: 'TypeScript' },
  { id: 'a0000000-0000-4000-8000-000000000002', name: 'JavaScript' },
  { id: 'a0000000-0000-4000-8000-000000000003', name: 'Python' },
  { id: 'a0000000-0000-4000-8000-000000000004', name: 'Rust' },
  { id: 'a0000000-0000-4000-8000-000000000005', name: 'Go' },
  { id: 'a0000000-0000-4000-8000-000000000006', name: 'PostgreSQL' },
  { id: 'a0000000-0000-4000-8000-000000000007', name: 'React' },
  { id: 'a0000000-0000-4000-8000-000000000008', name: 'Next.js' },
  { id: 'a0000000-0000-4000-8000-000000000009', name: 'Node.js' },
  { id: 'a0000000-0000-4000-8000-000000000010', name: 'NestJS' },
  { id: 'a0000000-0000-4000-8000-000000000011', name: 'Docker' },
  { id: 'a0000000-0000-4000-8000-000000000012', name: 'Java' },
  { id: 'a0000000-0000-4000-8000-000000000013', name: 'C++' },
  { id: 'a0000000-0000-4000-8000-000000000014', name: 'C#' },
  { id: 'a0000000-0000-4000-8000-000000000015', name: 'Ruby' },
];

interface ProfileFormProps {
  initialProfile: UserProfileData;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const formId = useId();

  // State
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [username, setUsername] = useState(initialProfile.username);
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [country, setCountry] = useState(initialProfile.country ?? '');

  // Institution logic
  const isPreset = PRESET_INSTITUTIONS.includes(
    initialProfile.institution as (typeof PRESET_INSTITUTIONS)[number],
  );
  const [selectedInstPreset, setSelectedInstPreset] = useState<string>(
    initialProfile.institution
      ? isPreset
        ? initialProfile.institution
        : 'OTHER'
      : '',
  );
  const [customInstitution, setCustomInstitution] = useState<string>(
    initialProfile.institution && !isPreset ? initialProfile.institution : '',
  );

  const [visibility, setVisibility] = useState<'public' | 'private'>(
    initialProfile.visibility,
  );
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(
    initialProfile.technologies.map((t) => t.id),
  );

  const [availableTechnologies, setAvailableTechnologies] = useState<
    TechnologyOption[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const countryOptions = getCountryOptions();
  const isDeveloper = profile.role === 'developer';

  // Fetch available technologies
  useEffect(() => {
    if (!isDeveloper) return;
    let active = true;
    apiRequest<TechnologyOption[]>('/technologies')
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setAvailableTechnologies(data);
        } else if (active) {
          setAvailableTechnologies(DEFAULT_TECHNOLOGIES);
        }
      })
      .catch(() => {
        // Fallback to initial technologies or defaults if endpoint temporarily unreachable
        if (active) {
          setAvailableTechnologies(
            initialProfile.technologies.length > 0
              ? initialProfile.technologies
              : DEFAULT_TECHNOLOGIES,
          );
        }
      });
    return () => {
      active = false;
    };
  }, [initialProfile.technologies]);

  function handleTechToggle(techId: string) {
    setSelectedTechIds((prev) => {
      if (prev.includes(techId)) {
        return prev.filter((id) => id !== techId);
      }
      if (prev.length >= 20) return prev;
      return [...prev, techId];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setFormError(null);
    setUsernameError(null);

    const institutionValue =
      selectedInstPreset === 'OTHER'
        ? customInstitution.trim() || null
        : selectedInstPreset || null;

    const payload: Record<string, unknown> = {
      username: username.trim(),
      bio: bio.trim() || null,
      country: country || null,
      institution: institutionValue,
      visibility,
    };

    if (isDeveloper) {
      payload.technologyIds = selectedTechIds;
    }

    try {
      const updated = await apiRequest<UserProfileData>('/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      setUsername(updated.username);
      setBio(updated.bio ?? '');
      setCountry(updated.country ?? '');
      setVisibility(updated.visibility);
      setSelectedTechIds(updated.technologies.map((t) => t.id));

      const updatedIsPreset = PRESET_INSTITUTIONS.includes(
        updated.institution as (typeof PRESET_INSTITUTIONS)[number],
      );
      setSelectedInstPreset(
        updated.institution
          ? updatedIsPreset
            ? updated.institution
            : 'OTHER'
          : '',
      );
      setCustomInstitution(
        updated.institution && !updatedIsPreset ? updated.institution : '',
      );

      setSuccessMessage('Profile settings saved successfully.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('profile-updated', { detail: updated }),
        );
      }
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setUsernameError(
            'This username is already taken. Please choose another.',
          );
        } else if (err.problem.errors && err.problem.errors.length > 0) {
          setFormError(err.problem.errors.join(', '));
        } else {
          setFormError(err.problem.detail ?? 'Failed to update profile.');
        }
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('An unexpected error occurred.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Avatar Section */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0F141D] p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Profile Photo</h2>
        <p className="mt-1 text-sm text-[#A1AABD] mb-6">
          Upload an image to represent you on public leaderboards and
          challenges.
        </p>
        <AvatarUpload
          currentAvatarUrl={profile.avatarUrl}
          userId={profile.id}
          onAvatarUpdated={(newUrl) => {
            setProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
            router.refresh();
          }}
        />
      </section>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-8 rounded-xl border border-white/[0.06] bg-[#0F141D] p-6"
      >
        <h2 className="text-lg font-semibold text-zinc-100">
          Personal Information
        </h2>

        {successMessage && (
          <div
            className="rounded-md bg-emerald-950/40 border border-emerald-800 p-4 text-sm text-emerald-300"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {formError && (
          <div
            className="rounded-md bg-red-950/40 border border-red-800 p-4 text-sm text-red-300"
            role="alert"
          >
            {formError}
          </div>
        )}

        {/* Username */}
        <div>
          <label
            htmlFor={`${formId}-username`}
            className="block text-sm font-medium text-zinc-200"
          >
            Username
          </label>
          <input
            id={`${formId}-username`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={saving}
            pattern="^[A-Za-z0-9_]{3,24}$"
            title="3-24 characters, letters, digits, or underscores"
            required
            className="mt-2 w-full rounded-md border border-white/[0.12] bg-[#0F141D] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-[#A1AABD]">
            3 to 24 characters: letters, numbers, and underscores.
          </p>
          {usernameError && (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {usernameError}
            </p>
          )}
        </div>

        {/* Bio with counter */}
        <div>
          <div className="flex justify-between items-center">
            <label
              htmlFor={`${formId}-bio`}
              className="block text-sm font-medium text-zinc-200"
            >
              Bio
            </label>
            <span
              className={`text-xs ${bio.length > 280 ? 'text-red-400 font-semibold' : 'text-[#A1AABD]'}`}
              aria-live="polite"
            >
              {bio.length}/280
            </span>
          </div>
          <textarea
            id={`${formId}-bio`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={saving}
            maxLength={280}
            rows={3}
            placeholder="Tell us about your development experience, interests, or background..."
            className="mt-2 w-full rounded-md border border-white/[0.12] bg-[#0F141D] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
          />
        </div>

        {/* Country Select */}
        <div>
          <label
            htmlFor={`${formId}-country`}
            className="block text-sm font-medium text-zinc-200"
          >
            Country / Region
          </label>
          <select
            id={`${formId}-country`}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-md border border-white/[0.12] bg-[#0F141D] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
          >
            <option value="">Select your country (optional)</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Institution */}
        <div>
          <label
            htmlFor={`${formId}-institution-preset`}
            className="block text-sm font-medium text-zinc-200"
          >
            Institution / School / Organization
          </label>
          <select
            id={`${formId}-institution-preset`}
            value={selectedInstPreset}
            onChange={(e) => setSelectedInstPreset(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-md border border-white/[0.12] bg-[#0F141D] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
          >
            <option value="">None / Independent</option>
            {PRESET_INSTITUTIONS.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
            <option value="OTHER">Other (enter custom)</option>
          </select>

          {selectedInstPreset === 'OTHER' && (
            <div className="mt-3">
              <label
                htmlFor={`${formId}-institution-custom`}
                className="block text-xs font-medium text-zinc-300"
              >
                Custom Institution Name
              </label>
              <input
                id={`${formId}-institution-custom`}
                type="text"
                value={customInstitution}
                onChange={(e) => setCustomInstitution(e.target.value)}
                disabled={saving}
                maxLength={120}
                placeholder="Enter organization name"
                className="mt-1 w-full rounded-md border border-white/[0.12] bg-[#0F141D] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
              />
            </div>
          )}
        </div>

        {/* Technologies Multi-select (Developers only) */}
        {isDeveloper && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="block text-sm font-medium text-zinc-200">
                Skills & Technologies
              </span>
              <span className="text-xs text-[#A1AABD]">
                {selectedTechIds.length}/20 selected
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-2.5">
              Select the skills and technologies you specialize in. These will be highlighted on your profile and shown to recruiters.
            </p>
            <div
              role="group"
              aria-label="Skills & Technologies"
              className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-md border border-white/[0.06] bg-[#090C11]/60"
            >
              {availableTechnologies.map((tech) => {
                const isSelected = selectedTechIds.includes(tech.id);
                return (
                  <button
                    type="button"
                    key={tech.id}
                    onClick={() => handleTechToggle(tech.id)}
                    aria-pressed={isSelected}
                    disabled={saving}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                      isSelected
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : 'bg-[#151925] text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {tech.name} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Visibility Toggle */}
        <fieldset className="rounded-lg border border-white/[0.06] bg-[#090C11]/40 p-4">
          <legend className="text-sm font-medium text-zinc-200 px-1">
            Profile Visibility
          </legend>
          <p className="text-xs text-[#A1AABD] mt-1 mb-3">
            Public profiles appear on leaderboards and institutional rankings.
            Private profiles are hidden from public rankings and visitors.
          </p>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-200">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                disabled={saving}
                className="h-4 w-4 text-indigo-600 focus:ring-violet-400 bg-[#0F141D] border-white/[0.12]"
              />
              Public
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-200">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                disabled={saving}
                className="h-4 w-4 text-indigo-600 focus:ring-violet-400 bg-[#0F141D] border-white/[0.12]"
              />
              Private
            </label>
          </div>
        </fieldset>

        {/* Save Button */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
          >
            {saving ? 'Saving changes...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone (Account Deletion) */}
      <DangerZone currentUsername={profile.username} />
    </div>
  );
}
