'use client';

import { useEffect, useState } from 'react';
import {
  Filter,
  Flame,
  MessageSquare,
  PenSquare,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import type {
  CommunityCategory,
  CommunityPost,
  CommunitySidebarData,
} from '@/lib/community';
import {
  getCommunityCategories,
  getCommunityPosts,
  getCommunitySidebar,
} from '@/lib/community';
import { PostCard } from '@/components/community/PostCard';
import { DiscussionSidebar } from '@/components/community/DiscussionSidebar';

export default function CommunityPage() {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [sidebar, setSidebar] = useState<CommunitySidebarData | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'votes' | 'comments'>('newest');
  const [loading, setLoading] = useState(true);

  // Load categories and sidebar
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, side] = await Promise.all([
          getCommunityCategories(),
          getCommunitySidebar(),
        ]);
        setCategories(cats);
        setSidebar(side);
      } catch {
        // ignore
      }
    }
    loadMeta();
  }, []);

  // Load posts on filters change
  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setLoading(true);
      try {
        const res = await getCommunityPosts({
          category: activeCategory || undefined,
          search: search || undefined,
          sort,
          page,
          limit: 15,
        });
        if (!cancelled) {
          setPosts(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages);
        }
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPosts();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, search, sort, page]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-violet-900/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              DevArena Discuss
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/30">
              Community
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Exchange solutions, ask technical questions, discuss algorithm challenges and share developer guides.
          </p>
        </div>

        <Link
          href="/community/new"
          className="flex sm:hidden items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-900/30"
        >
          <PenSquare className="w-4 h-4" />
          <span>Create Post</span>
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Feed Column */}
        <main className="flex-1 min-w-0 flex flex-col gap-5 w-full">
          {/* Controls: Search & Category Pills */}
          <div className="flex flex-col gap-3">
            {/* Search and Sort row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search discussions by title or content..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[#151329]/70 border border-violet-900/40 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Sort pills */}
              <div className="flex items-center bg-[#151329]/70 border border-violet-900/40 rounded-xl p-1 gap-1 self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setSort('newest')}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    sort === 'newest'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSort('votes')}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    sort === 'votes'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Top Voted
                </button>
                <button
                  type="button"
                  onClick={() => setSort('comments')}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    sort === 'comments'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Most Discussed
                </button>
              </div>
            </div>

            {/* Category horizontal scrolling pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                  !activeCategory
                    ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                    : 'bg-[#151329]/70 border-violet-900/30 text-zinc-400 hover:text-zinc-200 hover:border-violet-500/30'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id === activeCategory ? '' : cat.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    activeCategory === cat.id
                      ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                      : 'bg-[#151329]/70 border-violet-900/30 text-zinc-400 hover:text-zinc-200 hover:border-violet-500/30'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-violet-950/20 border border-violet-900/20 animate-pulse"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[#151329]/50 border border-violet-900/20 rounded-2xl gap-3">
              <MessageSquare className="w-10 h-10 text-violet-400/50" />
              <h3 className="text-base font-semibold text-zinc-200">
                No discussions found
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Be the first to start a conversation in this topic, or try searching for another term.
              </p>
              <Link
                href="/community/new"
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-900/30 transition-all"
              >
                Start a Discussion
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40 text-xs text-zinc-400">
              <span>
                Page {page} of {totalPages} ({total} discussions)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 disabled:opacity-40 hover:bg-zinc-800 text-zinc-200"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 disabled:opacity-40 hover:bg-zinc-800 text-zinc-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Sidebar Column */}
        <DiscussionSidebar sidebar={sidebar} />
      </div>
    </div>
  );
}
