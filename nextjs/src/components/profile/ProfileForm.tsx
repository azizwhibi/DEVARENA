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
  const isPreset = PRESET_INSTITUTIONS.includes(initialProfile.institution as (typeof PRESET_INSTITUTIONS)[number]);
  const [selectedInstPreset, setSelectedInstPreset] = useState<string>(
    initialProfile.institution ? (isPreset ? initialProfile.institution : 'OTHER') : '',
  );
  const [customInstitution, setCustomInstitution] = useState<string>(
    initialProfile.institution && !isPreset ? initialProfile.institution : '',
  );

  const [visibility, setVisibility] = useState<'public' | 'private'>(initialProfile.visibility);
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(
    initialProfile.technologies.map((t) => t.id),
  );

  const [availableTechnologies, setAvailableTechnologies] = useState<TechnologyOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const countryOptions = getCountryOptions();

  // Fetch available technologies
  useEffect(() => {
    let active = true;
    apiRequest<TechnologyOption[]>('/technologies')
      .then((data) => {
        if (active) setAvailableTechnologies(data);
      })
      .catch(() => {
        // Fallback to initial technologies if endpoint temporarily unreachable
        if (active && initialProfile.technologies.length > 0) {
          setAvailableTechnologies(initialProfile.technologies);
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

    const payload = {
      username: username.trim(),
      bio: bio.trim() || null,
      country: country || null,
      institution: institutionValue,
      visibility,
      technologyIds: selectedTechIds,
    };

    try {
      const updated = await apiRequest<UserProfileData>('/me/profile', {
        method: 'PATCH',
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
        updated.institution ? (updatedIsPreset ? updated.institution : 'OTHER') : '',
      );
      setCustomInstitution(
        updated.institution && !updatedIsPreset ? updated.institution : '',
      );

      setSuccessMessage('Profile settings saved successfully.');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setUsernameError('This username is already taken. Please choose another.');
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
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Profile Photo</h2>
        <p className="mt-1 text-sm text-zinc-400 mb-6">
          Upload an image to represent you on public leaderboards and challenges.
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Personal Information</h2>

        {successMessage && (
          <div className="rounded-md bg-emerald-950/40 border border-emerald-800 p-4 text-sm text-emerald-300" role="status">
            {successMessage}
          </div>
        )}

        {formError && (
          <div className="rounded-md bg-red-950/40 border border-red-800 p-4 text-sm text-red-300" role="alert">
            {formError}
          </div>
        )}

        {/* Username */}
        <div>
          <label htmlFor={`${formId}-username`} className="block text-sm font-medium text-zinc-200">
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
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-400">
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
            <label htmlFor={`${formId}-bio`} className="block text-sm font-medium text-zinc-200">
              Bio
            </label>
            <span
              className={`text-xs ${bio.length > 280 ? 'text-red-400 font-bold' : 'text-zinc-400'}`}
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
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        {/* Country Select */}
        <div>
          <label htmlFor={`${formId}-country`} className="block text-sm font-medium text-zinc-200">
            Country / Region
          </label>
          <select
            id={`${formId}-country`}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
          <label htmlFor={`${formId}-institution-preset`} className="block text-sm font-medium text-zinc-200">
            Institution / School / Organization
          </label>
          <select
            id={`${formId}-institution-preset`}
            value={selectedInstPreset}
            onChange={(e) => setSelectedInstPreset(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
              <label htmlFor={`${formId}-institution-custom`} className="block text-xs font-medium text-zinc-300">
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
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          )}
        </div>

        {/* Technologies Multi-select */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="block text-sm font-medium text-zinc-200">
              Technologies & Frameworks
            </span>
            <span className="text-xs text-zinc-400">
              {selectedTechIds.length}/20 selected
            </span>
          </div>
          <div
            role="group"
            aria-label="Technologies"
            className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-md border border-zinc-800 bg-zinc-950/60"
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
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isSelected
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tech.name} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibility Toggle */}
        <fieldset className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <legend className="text-sm font-medium text-zinc-200 px-1">
            Profile Visibility
          </legend>
          <p className="text-xs text-zinc-400 mt-1 mb-3">
            Public profiles appear on leaderboards and institutional rankings. Private profiles are hidden from public rankings and visitors.
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
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 border-zinc-700"
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
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 border-zinc-700"
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
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
