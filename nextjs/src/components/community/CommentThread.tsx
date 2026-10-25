"use client";
import { useState } from "react";
import { Check, Flag, Reply, Pencil, Trash2 } from "lucide-react";
import { useSkillsAccount } from "@/components/skills/SkillsWorkspace";
import {
  acceptAnswer,
  communityError,
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
  type CommunityComment,
  type CommunityPost,
} from "@/lib/community";
import styles from "./community.module.css";
export function CommentThread({
  post,
  comments,
  onChanged,
  onReport,
}: {
  post: CommunityPost;
  comments: CommunityComment[];
  onChanged(): void;
  onReport(id: string): void;
}) {
  const account = useSkillsAccount(),
    [content, setContent] = useState(""),
    [replying, setReplying] = useState<string | null>(null),
    [reply, setReply] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [edit, setEdit] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(action: () => Promise<unknown>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      done?.();
      onChanged();
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  function comment(item: CommunityComment) {
    const own = item.author_id === account.id,
      visible = item.status === "published";
    return (
      <article
        className={styles.comment}
        key={item.id}
        id={"comment-" + item.id}
      >
        <div className={styles.meta}>
          <strong>{item.author?.username ?? "Member"}</strong>
          {item.is_accepted && (
            <span>
              <Check size={16} strokeWidth={1.5} />
              Selected answer
            </span>
          )}
          {item.is_edited && <span>Edited</span>}
          <time dateTime={item.created_at}>
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </div>
        {editing === item.id ? (
          <form
            className={styles.commentForm}
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () => updateCommunityComment(item.id, { content: edit.trim() }),
                () => setEditing(null),
              );
            }}
          >
            <label className="sr-only" htmlFor={"edit-" + item.id}>
              Edit comment
            </label>
            <textarea
              id={"edit-" + item.id}
              className="input"
              required
              minLength={2}
              maxLength={10000}
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className="ui-button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="ui-button" disabled={busy}>
                Save comment
              </button>
            </div>
          </form>
        ) : (
          <p className={styles.content}>{item.content}</p>
        )}
        {visible && (
          <div className={styles.actions}>
            <div>
              {!item.parent_id &&
                !post.is_locked &&
                post.status === "published" && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setReplying(replying === item.id ? null : item.id);
                      setReply("");
                    }}
                  >
                    <Reply size={16} strokeWidth={1.5} />
                    Reply
                  </button>
                )}
              {own && !post.is_locked && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setEditing(item.id);
                    setEdit(item.content);
                  }}
                >
                  <Pencil size={16} strokeWidth={1.5} />
                  Edit
                </button>
              )}
              {(own || account.role === "admin") && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this comment?"))
                      void act(() => deleteCommunityComment(item.id));
                  }}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                  Delete
                </button>
              )}
              {post.author_id === account.id &&
                !post.is_locked &&
                post.status === "published" && (
                  <button
                    disabled={busy}
                    aria-pressed={item.is_accepted}
                    onClick={() =>
                      void act(() => acceptAnswer(post.id, item.id))
                    }
                  >
                    <Check size={16} strokeWidth={1.5} />
                    {item.is_accepted ? "Unselect answer" : "Select answer"}
                  </button>
                )}
              <button onClick={() => onReport(item.id)}>
                <Flag size={16} strokeWidth={1.5} />
                Report
              </button>
            </div>
          </div>
        )}
        {replying === item.id && (
          <form
            className={styles.commentForm}
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () =>
                  createCommunityComment(post.id, {
                    content: reply.trim(),
                    parentId: item.id,
                  }),
                () => {
                  setReplying(null);
                  setReply("");
                },
              );
            }}
          >
            <label htmlFor={"reply-" + item.id}>Your reply</label>
            <textarea
              className="input"
              id={"reply-" + item.id}
              required
              minLength={2}
              maxLength={10000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className="ui-button"
                onClick={() => setReplying(null)}
              >
                Cancel
              </button>
              <button className="ui-button ui-button-primary" disabled={busy}>
                Post reply
              </button>
            </div>
          </form>
        )}
        {!!item.replies?.length && (
          <div className={styles.replies}>{item.replies.map(comment)}</div>
        )}
      </article>
    );
  }
  return (
    <section className={styles.comments} id="comments">
      <h2>
        Comments <span className={styles.muted}>({post.comment_count})</span>
      </h2>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {post.is_locked || post.status !== "published" ? (
        <p className={styles.muted}>
          This discussion is closed to new comments.
        </p>
      ) : (
        <form
          className={styles.commentForm}
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              () =>
                createCommunityComment(post.id, { content: content.trim() }),
              () => setContent(""),
            );
          }}
        >
          <label htmlFor="new-comment">Add a comment</label>
          <textarea
            id="new-comment"
            className="input"
            required
            minLength={2}
            maxLength={10000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a useful reply."
          />
          <div className={styles.actions}>
            <button className="ui-button ui-button-primary" disabled={busy}>
              {busy ? "Saving…" : "Post comment"}
            </button>
          </div>
        </form>
      )}
      {comments.length ? (
        comments.map(comment)
      ) : (
        <p className={styles.muted}>No comments yet.</p>
      )}
    </section>
  );
}
