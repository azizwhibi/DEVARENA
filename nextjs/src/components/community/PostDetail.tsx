"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  communityError,
  deleteCommunityPost,
  getCommunityComments,
  getCommunityPost,
  moderatePost,
  type CommunityPost,
  type CommunityComment,
} from "@/lib/community";
import { useSkillsAccount } from "@/components/skills/SkillsWorkspace";
import { PostCard } from "./PostCard";
import { CommentThread } from "./CommentThread";
import { ReportModal } from "./ReportModal";
import styles from "./community.module.css";
export function PostDetail({ id }: { id: string }) {
  const account = useSkillsAccount(),
    router = useRouter(),
    [post, setPost] = useState<CommunityPost | null>(null),
    [comments, setComments] = useState<CommunityComment[]>([]),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<{
      postId?: string;
      commentId?: string;
    } | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([getCommunityPost(id), getCommunityComments(id)])
      .then(([p, c]) => {
        if (active) {
          setPost(p);
          setComments(c);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(communityError(e));
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  async function remove() {
    if (!window.confirm("Archive this post? It will leave the public feed."))
      return;
    setBusy(true);
    try {
      await deleteCommunityPost(id);
      router.push("/community");
    } catch (e) {
      setError(communityError(e));
      setBusy(false);
    }
  }
  async function moderate(data: {
    status?: "published" | "hidden" | "archived";
    isPinned?: boolean;
    isLocked?: boolean;
  }) {
    const reason = window.prompt("Reason for this moderation action:");
    if (!reason) return;
    setBusy(true);
    try {
      await moderatePost(id, { ...data, reason });
      setRevision((v) => v + 1);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="ui-button" href="/community">
        Back to posts
      </Link>
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            className="ui-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry
          </button>
        </p>
      )}
      {!post ? (
        !error && (
          <div
            className="skeleton skeleton-panel"
            role="status"
            aria-label="Loading discussion"
          />
        )
      ) : (
        <>
          <section className={styles.card}>
            <PostCard
              key={post.id + post.updated_at + post.vote_score}
              post={post}
              detail
            />
            <div className={styles.actions}>
              <div>
                {(post.author_id === account.id ||
                  account.role === "admin") && (
                  <>
                    <Link
                      href={"/community/" + id + "/edit"}
                      className="ui-button"
                    >
                      Edit post
                    </Link>
                    <button
                      className="ui-button"
                      disabled={busy}
                      onClick={() => void remove()}
                    >
                      Archive post
                    </button>
                  </>
                )}
                <button
                  className="ui-button"
                  onClick={() => setReport({ postId: id })}
                >
                  Report post
                </button>
              </div>
            </div>
            {(post.linked_challenge_id || post.linked_resource_id) && (
              <div className={styles.actions}>
                {post.linked_challenge_id && (
                  <Link href={"/arena?problem=" + post.linked_challenge_id}>
                    Related problem
                  </Link>
                )}
                {post.linked_resource_id && (
                  <Link href={"/knowledge/" + post.linked_resource_id}>
                    Related resource
                  </Link>
                )}
              </div>
            )}
            {account.role === "admin" && (
              <div className={styles.actions}>
                <div>
                  <button
                    className="ui-button"
                    disabled={busy}
                    onClick={() => void moderate({ isLocked: !post.is_locked })}
                  >
                    {post.is_locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    className="ui-button"
                    disabled={busy}
                    onClick={() => void moderate({ isPinned: !post.is_pinned })}
                  >
                    {post.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    className="ui-button"
                    disabled={busy}
                    onClick={() =>
                      void moderate({
                        status:
                          post.status === "published" ? "hidden" : "published",
                      })
                    }
                  >
                    {post.status === "published" ? "Hide" : "Restore"}
                  </button>
                </div>
              </div>
            )}
          </section>
          <CommentThread
            post={post}
            comments={comments}
            onChanged={() => setRevision((v) => v + 1)}
            onReport={(commentId) => setReport({ commentId })}
          />
        </>
      )}
      {report && <ReportModal {...report} onClose={() => setReport(null)} />}
    </>
  );
}
