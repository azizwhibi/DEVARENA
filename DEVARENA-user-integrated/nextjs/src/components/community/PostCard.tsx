'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  CheckCircle,
  Lock,
  MessageSquare,
  Pin,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CommunityPost } from '@/lib/community';
import { voteCommunityPost, toggleCommunityBookmark } from '@/lib/community';

export function PostCard({
  post,
  onVoteChange,
}: {
  post: CommunityPost;
  onVoteChange?: (postId: string, newScore: number, userVote: number) => void;
}) {
  const [voteScore, setVoteScore] = useState(post.vote_score || 0);
  const [userVote, setUserVote] = useState<number>(post.userVote || 0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(!!post.isBookmarked);
  const [voting, setVoting] = useState(false);

  const handleVote = async (delta: 1 | -1) => {
    if (voting) return;
    setVoting(true);
    const newVote = (userVote === delta ? 0 : delta) as -1 | 0 | 1;
    try {
      const res = await voteCommunityPost(post.id, newVote);
      setVoteScore(res.voteScore);
      setUserVote(res.userVote);
      onVoteChange?.(post.id, res.voteScore, res.userVote);
    } catch {
      // silently ignore or handle error
    } finally {
      setVoting(false);
    }
  };

  const handleBookmark = async () => {
    try {
      const res = await toggleCommunityBookmark(post.id);
      setIsBookmarked(res.isBookmarked);
    } catch {
      // ignore
    }
  };

  const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <article
      className={`relative flex flex-col sm:flex-row gap-4 p-5 rounded-xl border transition-all duration-200 ${
        post.is_pinned
          ? 'bg-violet-950/20 border-violet-500/40 hover:border-violet-400/60'
          : 'bg-[#151329]/70 border-violet-900/30 hover:border-violet-500/30'
      }`}
    >
      {/* Vote controls */}
      <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-1 sm:w-12 pt-0.5">
        <button
          type="button"
          aria-label="Upvote"
          onClick={() => handleVote(1)}
          disabled={voting}
          className={`p-1 rounded-lg transition-colors ${
            userVote === 1
              ? 'text-violet-400 bg-violet-500/20 hover:bg-violet-500/30'
              : 'text-zinc-400 hover:text-violet-300 hover:bg-zinc-800/50'
          }`}
        >
          <ArrowBigUp className="w-5 h-5 fill-current" />
        </button>
        <span
          className={`text-xs font-semibold select-none ${
            voteScore > 0
              ? 'text-violet-300'
              : voteScore < 0
              ? 'text-red-400'
              : 'text-zinc-400'
          }`}
        >
          {voteScore}
        </span>
        <button
          type="button"
          aria-label="Downvote"
          onClick={() => handleVote(-1)}
          disabled={voting}
          className={`p-1 rounded-lg transition-colors ${
            userVote === -1
              ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
              : 'text-zinc-400 hover:text-red-300 hover:bg-zinc-800/50'
          }`}
        >
          <ArrowBigDown className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Main post details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 mb-2">
          {post.category && (
            <span className="px-2 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {post.category.name}
            </span>
          )}

          {post.is_pinned && (
            <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <Pin className="w-3 h-3 fill-current" /> Pinned
            </span>
          )}

          {post.is_locked && (
            <span className="flex items-center gap-1 text-zinc-400 font-medium bg-zinc-800 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}

          {post.accepted_comment_id && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle className="w-3 h-3" /> Solved
            </span>
          )}

          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formattedDate}
          </span>

          {post.is_edited && <span className="italic text-zinc-500">(edited)</span>}
        </div>

        {/* Title link */}
        <Link href={`/community/${post.id}`} className="group block mb-2">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Content snippet */}
        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
          {post.content}
        </p>

        {/* Tags and footer */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-zinc-800/40 text-xs">
          {/* Topics */}
          <div className="flex items-center flex-wrap gap-1.5">
            {post.topics && post.topics.length > 0 ? (
              post.topics.map((topic) => (
                <span
                  key={topic}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/70 text-zinc-300 border border-zinc-700/40"
                >
                  <Tag className="w-2.5 h-2.5 text-zinc-400" />
                  {topic}
                </span>
              ))
            ) : null}
          </div>

          {/* Author and actions */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <div className="w-5 h-5 rounded-full bg-violet-600/30 flex items-center justify-center text-[10px] text-violet-200 font-semibold uppercase">
                {post.author?.username?.[0] || 'D'}
              </div>
              <span className="font-medium text-zinc-300">
                {post.author?.username || 'Developer'}
              </span>
            </div>

            <Link
              href={`/community/${post.id}#comments`}
              className="flex items-center gap-1 text-zinc-400 hover:text-violet-300 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{post.comment_count || 0}</span>
            </Link>

            <button
              type="button"
              onClick={handleBookmark}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark discussion'}
              className={`p-1 rounded transition-colors ${
                isBookmarked
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
