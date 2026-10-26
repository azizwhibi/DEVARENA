"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Bookmark,
  MessageSquare,
  Pin,
  Lock,
  Check,
} from "lucide-react";
import {
  communityError,
  toggleCommunityBookmark,
  voteCommunityPost,
  type CommunityPost,
} from "@/lib/community";
import styles from "./community.module.css";
export function PostCard({
  post,
  detail = false,
}: {
  post: CommunityPost;
  detail?: boolean;
}) {
  const [score, setScore] = useState(post.vote_score),
    [vote, setVote] = useState(post.userVote ?? 0),
    [saved, setSaved] = useState(!!post.isBookmarked),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(action: "vote" | "save", value?: 1 | -1) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "save") {
        const r = await toggleCommunityBookmark(post.id);
        setSaved(r.isBookmarked);
      } else {
        const r = await voteCommunityPost(post.id, vote === value ? 0 : value!);
        setScore(r.voteScore);
        setVote(r.userVote);
      }
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={detail ? "" : styles.card} aria-label={post.title}>
      <div className={styles.post}>
        <div className={styles.vote}>
          <button
            aria-label={"Upvote " + post.title}
            aria-pressed={vote === 1}
            disabled={busy || post.is_locked || post.status !== "published"}
            onClick={() => void act("vote", 1)}
          >
            <ArrowUp size={18} strokeWidth={1.5} />
          </button>
          <strong aria-label="Vote score">{score}</strong>
          <button
            aria-label={"Downvote " + post.title}
            aria-pressed={vote === -1}
            disabled={busy || post.is_locked || post.status !== "published"}
            onClick={() => void act("vote", -1)}
          >
            <ArrowDown size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={styles.category}>
              {post.category?.name ?? "Discussion"}
            </span>
            {post.is_pinned && (
              <span>
                <Pin size={16} strokeWidth={1.5} />
                Pinned
              </span>
            )}
            {post.is_locked && (
              <span>
                <Lock size={16} strokeWidth={1.5} />
                Locked
              </span>
            )}
            {post.accepted_comment_id && (
              <span>
                <Check size={16} strokeWidth={1.5} />
                Answer selected
              </span>
            )}
            {post.status !== "published" && <span>{post.status}</span>}
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </time>
          </div>
          {detail ? (
            <h2 className={styles.detailTitle}>{post.title}</h2>
          ) : (
            <h2>
              <Link className={styles.titleLink} href={"/community/" + post.id}>
                {post.title}
              </Link>
            </h2>
          )}
          <p className={detail ? styles.content : styles.excerpt}>
            {post.content}
          </p>
          {!!post.topics?.length && (
            <div className={styles.tags}>
              {post.topics.map((tag) => (
                <Link
                  className={styles.tag}
                  key={tag}
                  href={"/community?topic=" + encodeURIComponent(tag)}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            <span>
              {post.author?.username ?? "Member"}
              {post.is_edited ? " · Edited" : ""}
            </span>
            <div>
              <Link
                href={"/community/" + post.id + "#comments"}
                aria-label={`${post.comment_count} comments on ${post.title}`}
              >
                <MessageSquare size={18} strokeWidth={1.5} />
                {post.comment_count}
              </Link>
              <button
                aria-label={saved ? "Remove saved post" : "Save post"}
                aria-pressed={saved}
                disabled={busy || post.status !== "published"}
                onClick={() => void act("save")}
              >
                <Bookmark size={18} strokeWidth={1.5} />
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </article>
  );
}
