'use client';

import { useState } from 'react';
import {
  Check,
  CheckCircle,
  CornerDownRight,
  Edit2,
  Flag,
  MessageSquare,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { CommunityComment, CommunityPost } from '@/lib/community';
import {
  acceptAnswer,
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
} from '@/lib/community';

export function CommentThread({
  post,
  comments: initialComments,
  currentUserId,
  onReport,
}: {
  post: CommunityPost;
  comments: CommunityComment[];
  currentUserId?: string;
  onReport?: (commentId: string) => void;
}) {
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const isPostAuthor = currentUserId === post.author_id;

  const handleAddRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const added = await createCommunityComment(post.id, {
        content: newContent.trim(),
      });
      setComments((prev) => [...prev, added]);
      setNewContent('');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const added = await createCommunityComment(post.id, {
        content: replyContent.trim(),
        parentId,
      });

      setComments((prev) =>
        prev.map((root) => {
          if (root.id === parentId) {
            return {
              ...root,
              replies: [...(root.replies || []), added],
            };
          }
          return root;
        }),
      );
      setReplyingTo(null);
      setReplyContent('');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateCommunityComment(commentId, {
        content: editContent.trim(),
      });
      const updateInTree = (list: CommunityComment[]): CommunityComment[] =>
        list.map((c) => {
          if (c.id === commentId) return { ...c, content: updated.content, is_edited: true };
          if (c.replies) return { ...c, replies: updateInTree(c.replies) };
          return c;
        });

      setComments((prev) => updateInTree(prev));
      setEditingId(null);
      setEditContent('');
    } catch {
      // ignore
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteCommunityComment(commentId);
      const removeFromTree = (list: CommunityComment[]): CommunityComment[] =>
        list
          .map((c) => {
            if (c.id === commentId) {
              if (c.replies && c.replies.length > 0) {
                return {
                  ...c,
                  content: '[This comment was deleted by its author]',
                  status: 'deleted' as const,
                };
              }
              return null;
            }
            if (c.replies) return { ...c, replies: removeFromTree(c.replies) };
            return c;
          })
          .filter(Boolean) as CommunityComment[];

      setComments((prev) => removeFromTree(prev));
    } catch {
      // ignore
    }
  };

  const handleAcceptAnswer = async (commentId: string) => {
    try {
      const res = await acceptAnswer(post.id, commentId);
      const updatedAcceptedId = res.acceptedCommentId;
      const updateAcceptedInTree = (list: CommunityComment[]): CommunityComment[] =>
        list.map((c) => ({
          ...c,
          is_accepted: c.id === updatedAcceptedId,
          replies: c.replies ? updateAcceptedInTree(c.replies) : [],
        }));

      setComments((prev) => updateAcceptedInTree(prev));
    } catch {
      // ignore
    }
  };

  const renderComment = (comment: CommunityComment, isReply = false) => {
    const isAuthor = currentUserId === comment.author_id;
    const isAccepted = comment.is_accepted;
    const isDeleted = comment.status === 'deleted';

    return (
      <div
        key={comment.id}
        className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all ${
          isAccepted
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : isReply
            ? 'bg-[#181630]/60 border-violet-900/20 ml-4 sm:ml-8 mt-2'
            : 'bg-[#151329]/70 border-violet-900/30'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet-600/30 flex items-center justify-center text-[10px] text-violet-200 font-semibold uppercase">
              {comment.author?.username?.[0] || 'D'}
            </div>
            <span className="font-medium text-zinc-200">
              {comment.author?.username || 'Developer'}
            </span>
            {comment.author_id === post.author_id && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300">
                Author
              </span>
            )}
            <span>•</span>
            <span>
              {new Date(comment.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {comment.is_edited && <span className="italic text-zinc-500">(edited)</span>}
          </div>

          <div className="flex items-center gap-2">
            {isAccepted && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /> Accepted Answer
              </span>
            )}

            {isPostAuthor && !isReply && !isDeleted && (
              <button
                type="button"
                onClick={() => handleAcceptAnswer(comment.id)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  isAccepted
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
                }`}
              >
                {isAccepted ? 'Unmark solution' : 'Accept solution'}
              </button>
            )}
          </div>
        </div>

        {/* Content or Edit Form */}
        {editingId === comment.id ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-violet-500/50 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEdit(comment.id)}
                className="px-3 py-1 text-xs font-medium rounded bg-violet-600 text-white hover:bg-violet-500"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isDeleted ? 'italic text-zinc-500' : 'text-zinc-300'
            }`}
          >
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!isDeleted && editingId !== comment.id && (
          <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400">
            {!post.is_locked && !isReply && (
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyContent('');
                }}
                className="flex items-center gap-1 hover:text-violet-300 transition-colors"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}

            {isAuthor && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="flex items-center gap-1 hover:text-violet-300 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  className="flex items-center gap-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </>
            )}

            {onReport && (
              <button
                type="button"
                onClick={() => onReport(comment.id)}
                className="flex items-center gap-1 hover:text-amber-400 ml-auto transition-colors"
              >
                <Flag className="w-3 h-3" />
                <span>Report</span>
              </button>
            )}
          </div>
        )}

        {/* Reply Box */}
        {replyingTo === comment.id && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-800/40">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={2}
              className="w-full bg-zinc-900 border border-violet-900/40 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddReply(comment.id)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>Post Reply</span>
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="comments" className="flex flex-col gap-6 mt-8">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-zinc-100">
          Discussion ({comments.length})
        </h3>
      </div>

      {/* New Root Comment Form */}
      {post.is_locked ? (
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-400">
          This discussion is locked by administrators. No new comments can be added.
        </div>
      ) : (
        <form
          onSubmit={handleAddRootComment}
          className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-4 flex flex-col gap-3"
        >
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share your answer, code snippet or constructive feedback..."
            rows={3}
            className="w-full bg-zinc-950/60 border border-violet-900/40 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Markdown formatted code and text supported</span>
            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 shadow-md shadow-violet-900/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </form>
      )}

      {/* List of comments */}
      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500 bg-[#151329]/40 border border-violet-900/20 rounded-xl">
            No comments yet. Be the first to share an approach or solution!
          </div>
        ) : (
          comments.map((root) => renderComment(root))
        )}
      </div>
    </section>
  );
}
