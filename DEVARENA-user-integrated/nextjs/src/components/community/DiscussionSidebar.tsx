'use client';

import Link from 'next/link';
import {
  Bookmark,
  FileText,
  Flame,
  MessageSquare,
  PenSquare,
  Pin,
  Sparkles,
} from 'lucide-react';
import type { CommunitySidebarData } from '@/lib/community';

export function DiscussionSidebar({
  sidebar,
  activeFilter,
}: {
  sidebar?: CommunitySidebarData | null;
  activeFilter?: string;
}) {
  return (
    <aside className="w-full lg:w-72 flex flex-col gap-5">
      {/* Primary Action Button */}
      <Link
        href="/community/new"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <PenSquare className="w-4 h-4" />
        <span>Create Post</span>
      </Link>

      {/* Quick navigation */}
      <div className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-3 flex flex-col gap-1 text-sm">
        <Link
          href="/community"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
            !activeFilter
              ? 'bg-violet-600/20 text-violet-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>All Discussions</span>
        </Link>
        <Link
          href="/community/my-posts"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
            activeFilter === 'my-posts'
              ? 'bg-violet-600/20 text-violet-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Publications</span>
        </Link>
        <Link
          href="/community/saved"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
            activeFilter === 'saved'
              ? 'bg-violet-600/20 text-violet-300 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Discussions</span>
        </Link>
      </div>

      {/* Pinned Announcements */}
      {sidebar?.announcements && sidebar.announcements.length > 0 && (
        <div className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>Announcements</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {sidebar.announcements.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="group block"
              >
                <h4 className="text-sm font-medium text-zinc-200 group-hover:text-violet-300 line-clamp-2 transition-colors">
                  {post.title}
                </h4>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {post.comment_count || 0} comments
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Popular Discussions */}
      {sidebar?.popular && sidebar.popular.length > 0 && (
        <div className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300 mb-3">
            <Flame className="w-3.5 h-3.5 text-orange-400 fill-current" />
            <span>Trending Topics</span>
          </div>
          <div className="flex flex-col gap-3">
            {sidebar.popular.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="group flex flex-col gap-0.5"
              >
                <span className="text-sm font-medium text-zinc-300 group-hover:text-violet-300 line-clamp-2 transition-colors">
                  {post.title}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{post.vote_score || 0} votes</span>
                  <span>•</span>
                  <span>{post.comment_count || 0} comments</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Community Guidelines Card */}
      <div className="bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border border-violet-800/30 rounded-xl p-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Forum Guidelines</span>
        </div>
        <p className="leading-relaxed">
          Be respectful and share constructive solutions. Do not post private test case answers or protected hints.
        </p>
      </div>
    </aside>
  );
}
