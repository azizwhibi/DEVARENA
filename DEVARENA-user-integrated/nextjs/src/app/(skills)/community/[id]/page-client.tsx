'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowLeft,
  Bookmark,
  CheckCircle,
  Clock,
  Edit2,
  Flag,
  Lock,
  MessageSquare,
  Pin,
  Share2,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import type { CommunityComment, CommunityPost } from '@/lib/community';
import {
  deleteCommunityPost,
  getCommunityComments,
  getCommunityPost,
  toggleCommunityBookmark,
  voteCommunityPost,
} from '@/lib/community';
import { useAccount } from '@/components/AccountProvider';
import { CommentThread } from '@/components/community/CommentThread';
import { ReportModal } from '@/components/community/ReportModal';

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { account } = useAccount();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [voteScore, setVoteScore] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedCommentId, setReportedCommentId] = useState<string | undefined>();
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, c] = await Promise.all([
          getCommunityPost(resolvedParams.id),
          getCommunityComments(resolvedParams.id),
        ]);
        setPost(p);
        setComments(c);
        setVoteScore(p.vote_score || 0);
        setUserVote(p.userVote || 0);
        setIsBookmarked(!!p.isBookmarked);
      } catch (err: any) {
        setError(err?.message || 'Failed to load discussion.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams.id]);

  const handleVote = async (delta: 1 | -1) => {
    if (!post) return;
    const newVote = (userVote === delta ? 0 : delta) as -1 | 0 | 1;
    try {
      const res = await voteCommunityPost(post.id, newVote);
      setVoteScore(res.voteScore);
      setUserVote(res.userVote);
    } catch {
      // ignore
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    try {
      const res = await toggleCommunityBookmark(post.id);
      setIsBookmarked(res.isBookmarked);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('Are you sure you want to delete this publication?')) return;
    try {
      await deleteCommunityPost(post.id);
      router.push('/community');
    } catch {
      // ignore
    }
  };

  const generateAiSummary = () => {
    if (!post) return;
    setAiSummary(
      `AI Summary: "${post.title}" focuses on key implementation patterns. The discussion addresses core trade-offs with community solutions emphasizing modular design and validation.`,
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full p-8 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-violet-950/40 rounded-lg" />
        <div className="h-10 w-3/4 bg-violet-950/40 rounded-xl" />
        <div className="h-64 bg-violet-950/20 rounded-2xl border border-violet-900/30" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto w-full p-8 text-center flex flex-col items-center gap-3">
        <div className="p-6 rounded-2xl bg-[#151329]/70 border border-violet-900/30 text-zinc-300">
          <p className="text-sm font-medium">{error || 'Post not found.'}</p>
          <Link
            href="/community"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to discussions
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = account?.id === post.author_id;
  const isAdmin = account?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6">
      {/* Top back navigation and actions */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <Link
          href="/community"
          className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>

        <div className="flex items-center gap-3">
          {(isAuthor || isAdmin) && (
            <>
              <Link
                href={`/community/${post.id}/edit`}
                className="flex items-center gap-1 text-zinc-400 hover:text-violet-300 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setReportedCommentId(undefined);
              setReportOpen(true);
            }}
            className="flex items-center gap-1 text-zinc-500 hover:text-amber-400 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Main Post Card */}
      <article className="bg-[#151329]/70 border border-violet-900/30 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
        {/* Post Metadata */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400">
            {post.category && (
              <span className="px-2.5 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
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
              <Clock className="w-3 h-3" />{' '}
              {new Date(post.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {post.is_edited && <span className="italic text-zinc-500">(edited)</span>}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {post.title}
          </h1>

          {/* Author bar */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-xs text-violet-200 font-semibold uppercase">
              {post.author?.username?.[0] || 'D'}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-200">
                {post.author?.username || 'Developer'}
              </div>
              <div className="text-[11px] text-zinc-500">Community Member</div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="text-sm sm:text-base text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans border-t border-zinc-800/80 pt-5">
          {post.content}
        </div>

        {/* Topics */}
        {post.topics && post.topics.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 pt-2">
            {post.topics.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                <Tag className="w-3 h-3 text-zinc-400" />
                {t}
              </span>
            ))}
          </div>
        )}

        {/* AI Assistant summary button */}
        <div className="pt-2">
          {!aiSummary ? (
            <button
              type="button"
              onClick={generateAiSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-300 bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Ask Gemini for discussion summary</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-700/30 text-xs text-violet-200 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-violet-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Assistant Insights</span>
              </div>
              <p>{aiSummary}</p>
            </div>
          )}
        </div>

        {/* Footer actions: Vote & Bookmark */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVote(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                userVote === 1
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-violet-500/50'
              }`}
            >
              <ArrowBigUp className="w-4 h-4 fill-current" />
              <span>Upvote</span>
              <span>({voteScore})</span>
            </button>
            <button
              type="button"
              onClick={() => handleVote(-1)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                userVote === -1
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/50'
              }`}
            >
              <ArrowBigDown className="w-4 h-4 fill-current" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isBookmarked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </article>

      {/* Comment Section */}
      <CommentThread
        post={post}
        comments={comments}
        currentUserId={account?.id}
        onReport={(commentId) => {
          setReportedCommentId(commentId);
          setReportOpen(true);
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={reportedCommentId ? undefined : post.id}
        commentId={reportedCommentId}
      />
    </div>
  );
}
