'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Code, Eye, FileText, Send, Sparkles } from 'lucide-react';
import type { CommunityCategory } from '@/lib/community';
import { createCommunityPost, getCommunityCategories } from '@/lib/community';

export default function NewPostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const cats = await getCommunityCategories();
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

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
      const created = await createCommunityPost({
        title: title.trim(),
        content: content.trim(),
        categoryId,
        topics: topics.length > 0 ? topics : undefined,
      });
      router.push(`/community/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create discussion post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="p-2 rounded-xl bg-[#151329]/70 border border-violet-900/30 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Create Discussion
          </h1>
          <p className="text-xs text-zinc-400">
            Share code, ask an architecture question or propose a new approach.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Post Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#151329]/70 border border-violet-900/30 rounded-2xl p-5 sm:p-8 flex flex-col gap-5 shadow-xl"
      >
        {/* Title */}
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
            placeholder="e.g. Best pattern for managing WebSockets with NestJS and React"
            className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Category & Topics Grid */}
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
              Topics / Tags (comma separated)
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="e.g. nestjs, typescript, algorithms"
              className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Content with Write / Preview Tabs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Discussion Content (Markdown)
            </label>
            <div className="flex items-center gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  tab === 'write'
                    ? 'bg-violet-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  tab === 'preview'
                    ? 'bg-violet-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {tab === 'write' ? (
            <textarea
              required
              minLength={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Explain the context, paste code blocks, or describe your question in detail..."
              rows={12}
              className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-xl p-4 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
            />
          ) : (
            <div className="w-full min-h-[280px] bg-zinc-950/70 border border-violet-900/40 rounded-xl p-4 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {content ? (
                content
              ) : (
                <span className="text-zinc-500 italic">Nothing to preview yet.</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
          <Link
            href="/community"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Publishing...' : 'Publish Discussion'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
