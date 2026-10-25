'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark } from 'lucide-react';
import type { CommunityPost } from '@/lib/community';
import { getMySavedCommunityPosts } from '@/lib/community';
import { PostCard } from '@/components/community/PostCard';
import { DiscussionSidebar } from '@/components/community/DiscussionSidebar';

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const saved = await getMySavedCommunityPosts();
        setPosts(saved);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 border-b border-violet-900/30 pb-6">
        <Link
          href="/community"
          className="p-2 rounded-xl bg-[#151329]/70 border border-violet-900/30 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Saved Discussions
          </h1>
          <p className="text-xs text-zinc-400">
            Bookmarked conversations, code examples and answers for quick reference.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <main className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          {loading ? (
            <div className="h-40 rounded-xl bg-violet-950/20 border border-violet-900/20 animate-pulse" />
          ) : posts.length === 0 ? (
            <div className="p-12 text-center bg-[#151329]/50 border border-violet-900/20 rounded-2xl flex flex-col items-center gap-3">
              <Bookmark className="w-10 h-10 text-violet-400/50" />
              <h3 className="text-base font-semibold text-zinc-200">
                No saved discussions yet
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                When you find an interesting approach or helpful answer, click the bookmark icon to save it here.
              </p>
              <Link
                href="/community"
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-900/30"
              >
                Explore Discussions
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </main>

        <DiscussionSidebar activeFilter="saved" />
      </div>
    </div>
  );
}
