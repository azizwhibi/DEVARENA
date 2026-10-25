'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import type { CommunityCategory } from '@/lib/community';
import {
  getCommunityCategories,
  getCommunityPost,
  updateCommunityPost,
} from '@/lib/community';

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cats, post] = await Promise.all([
          getCommunityCategories(),
          getCommunityPost(resolvedParams.id),
        ]);
        setCategories(cats);
        setTitle(post.title);
        setCategoryId(post.category_id);
        setContent(post.content);
        setTopicsInput((post.topics || []).join(', '));
      } catch (err: any) {
        setError(err?.message || 'Failed to load post for editing.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;
    setSubmitting(true);
    setError('');

    const topics = topicsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updateCommunityPost(resolvedParams.id, {
        title: title.trim(),
        content: content.trim(),
        categoryId,
        topics,
      });
      router.push(`/community/${resolvedParams.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update post.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full p-8 animate-pulse text-zinc-400">
        Loading post details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/community/${resolvedParams.id}`}
          className="p-2 rounded-xl bg-[#151329]/70 border border-violet-900/30 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Edit Discussion
          </h1>
          <p className="text-xs text-zinc-400">
            Update your title, category, tags or discussion content.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[#151329]/70 border border-violet-900/30 rounded-2xl p-5 sm:p-8 flex flex-col gap-5 shadow-xl"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Title
          </label>
          <input
            type="text"
            required
            minLength={5}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-zinc-900 text-zinc-200">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Topics / Tags
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Content
          </label>
          <textarea
            required
            minLength={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl p-4 text-sm text-zinc-100 font-mono focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
          <Link
            href={`/community/${resolvedParams.id}`}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
