'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/api';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userId: string;
  onAvatarUpdated: (newUrl: string) => void;
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const VALID_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export function AvatarUpload({
  currentAvatarUrl,
  userId,
  onAvatarUpdated,
}: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation: size
    if (file.size > MAX_SIZE_BYTES) {
      setError('File size must be 2 MB or smaller.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Determine and normalize MIME type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mimeType = file.type?.toLowerCase();
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'webp') mimeType = 'image/webp';
    } else if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') {
      mimeType = 'image/jpeg';
    }

    const isValidMime = ['image/png', 'image/jpeg', 'image/webp'].includes(
      mimeType,
    );
    const isValidExt = VALID_EXTENSIONS.includes(ext);

    if (!isValidMime || !isValidExt) {
      setError('Only PNG, JPEG, and WebP images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const normalizedExt = ext === 'jpg' ? 'jpeg' : ext;
      const fileName = `${Date.now()}.${normalizedExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload to Supabase Storage avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const newAvatarUrl = urlData.publicUrl;

      // 3. Update profile via PATCH /me/profile
      const updated = await apiRequest<{ avatarUrl: string | null }>(
        '/me/profile',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: newAvatarUrl }),
        },
      );

      // 4. Delete older files in folder to keep only the latest avatar
      try {
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(userId);

        if (files && files.length > 0) {
          const toDelete = files
            .filter(
              (f) =>
                f.name !== fileName && f.name !== '.emptyFolderPlaceholder',
            )
            .map((f) => `${userId}/${f.name}`);

          if (toDelete.length > 0) {
            await supabase.storage.from('avatars').remove(toDelete);
          }
        }
      } catch {
        // Cleanup of older avatars is best-effort and non-fatal
      }

      onAvatarUpdated(updated?.avatarUrl ?? newAvatarUrl);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(msg);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[#151925] ring-2 ring-white/[0.06]">
        {currentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAvatarUrl}
            alt="Current profile avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#A1AABD]"
            aria-hidden="true"
          >
            ?
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
            ...
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="avatar-upload-input"
          className={`cursor-pointer inline-flex items-center justify-center rounded-md bg-[#151925] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            loading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {loading ? 'Uploading...' : 'Change avatar'}
        </label>
        <input
          id="avatar-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          disabled={loading}
          onChange={handleFileChange}
          className="sr-only"
        />
        <span className="text-xs text-[#A1AABD]">
          PNG, JPEG or WebP up to 2 MB.
        </span>
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
