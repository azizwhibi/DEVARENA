"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  communityError,
  createCommunityPost,
  getCommunityCategories,
  getCommunityPost,
  updateCommunityPost,
  type CommunityCategory,
} from "@/lib/community";
import { useSkillsAccount } from "@/components/skills/SkillsWorkspace";
import styles from "./community.module.css";
export function PostEditor({ id }: { id?: string }) {
  const router = useRouter(),
    account = useSkillsAccount();
  const [categories, setCategories] = useState<CommunityCategory[]>([]),
    [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [category, setCategory] = useState(""),
    [tags, setTags] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([
      getCommunityCategories(),
      id ? getCommunityPost(id) : Promise.resolve(null),
    ])
      .then(([cats, post]) => {
        if (!active) return;
        const allowed = cats.filter(
          (c) => account.role === "admin" || c.slug !== "announcements",
        );
        setCategories(allowed);
        setCategory(post?.category_id ?? allowed[0]?.id ?? "");
        setTitle(post?.title ?? "");
        setContent(post?.content ?? "");
        setTags(post?.topics?.join(", ") ?? "");
        setReady(true);
        setError("");
      })
      .catch((e) => {
        if (active) setError(communityError(e));
      });
    return () => {
      active = false;
    };
  }, [id, account.role, revision]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        categoryId: category,
        topics: [
          ...new Set(
            tags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        ],
      };
      const result = id
        ? await updateCommunityPost(id, data)
        : await createCommunityPost(data);
      router.push("/community/" + result.id);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2 className="page-title">{id ? "Edit post" : "New post"}</h2>
      {error && (
        <div className={styles.error} role="alert">
          {error}
          {!ready && (
            <button
              className="ui-button"
              onClick={() => setRevision((v) => v + 1)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!ready ? (
        !error && (
          <div
            className="skeleton skeleton-panel"
            role="status"
            aria-label="Loading post editor"
          />
        )
      ) : (
        <form
          className={styles.card + " " + styles.form}
          onSubmit={(e) => void submit(e)}
        >
          <label>
            Title
            <input
              className="input"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              className="input"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tags
            <input
              className="input"
              value={tags}
              maxLength={420}
              onChange={(e) => setTags(e.target.value)}
              placeholder="javascript, arrays"
            />
            <span className={styles.muted}>
              Up to 10 tags, separated by commas.
            </span>
          </label>
          <label>
            Content
            <textarea
              className="input"
              required
              minLength={10}
              maxLength={50000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your question, approach, or code."
            />
          </label>
          <div className={styles.actions}>
            <Link
              className="ui-button"
              href={id ? "/community/" + id : "/community"}
            >
              Cancel
            </Link>
            <button
              className="ui-button ui-button-primary"
              disabled={busy || !category}
            >
              {busy ? "Saving…" : id ? "Save changes" : "Publish post"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
