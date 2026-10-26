"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  communityError,
  getCommunityCategories,
  getCommunityPosts,
  getMyCommunityPosts,
  getMySavedCommunityPosts,
  type CommunityCategory,
  type CommunityPostsResponse,
} from "@/lib/community";
import { PostCard } from "./PostCard";
import styles from "./community.module.css";
export function CommunityFeed({
  mode = "all",
}: {
  mode?: "all" | "mine" | "saved";
}) {
  const params = useSearchParams(),
    router = useRouter(),
    [data, setData] = useState<CommunityPostsResponse | null>(null),
    [categories, setCategories] = useState<CommunityCategory[]>([]),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const search = params.get("search") ?? "",
    category = params.get("category") ?? "",
    topic = params.get("topic") ?? "",
    sort = params.get("sort") ?? "newest",
    page = Math.max(1, Number(params.get("page")) || 1);
  useEffect(() => {
    let active = true;
    void Promise.all([
      getCommunityCategories(),
      mode === "mine"
        ? getMyCommunityPosts({ page, limit: 15 })
        : mode === "saved"
          ? getMySavedCommunityPosts().then((items) => ({
              items: items.slice((page - 1) * 15, page * 15),
              total: items.length,
              page,
              limit: 15,
              totalPages: Math.ceil(items.length / 15),
            }))
          : getCommunityPosts({
              search,
              category,
              topic,
              sort: sort as "newest" | "votes" | "comments",
              page,
              limit: 15,
            }),
    ])
      .then(([cats, result]) => {
        if (active) {
          setCategories(cats);
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(communityError(e));
      });
    return () => {
      active = false;
    };
  }, [mode, search, category, topic, sort, page, revision]);
  function filter(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(values)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in values)) next.delete("page");
    setData(null);
    router.replace("?" + next.toString(), { scroll: false });
  }
  return (
    <>
      {mode === "all" && (
        <form
          className={styles.filters}
          key={search + category + sort + categories.length}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            filter({
              search: String(f.get("search") ?? ""),
              category: String(f.get("category") ?? ""),
              sort: String(f.get("sort") ?? "newest"),
            });
          }}
        >
          <label>
            Search
            <input
              className="input"
              name="search"
              maxLength={120}
              defaultValue={search}
              placeholder="Title or content"
            />
          </label>
          <label>
            Category
            <select className="input" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select className="input" name="sort" defaultValue={sort}>
              <option value="newest">Newest</option>
              <option value="votes">Top voted</option>
              <option value="comments">Most discussed</option>
            </select>
          </label>
          <button className="ui-button">Search</button>
          {(search || category || topic) && (
            <button
              className="ui-button"
              type="button"
              onClick={() => filter({ search: "", category: "", topic: "" })}
            >
              Clear
            </button>
          )}
        </form>
      )}
      {topic && <p className={styles.muted}>Tag: {topic}</p>}
      {error ? (
        <div className={styles.error} role="alert">
          {error}{" "}
          <button
            className="ui-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <div
          className="skeleton skeleton-panel"
          role="status"
          aria-label="Loading discussions"
        />
      ) : !data.items.length ? (
        <div className={styles.empty}>
          {mode === "saved"
            ? "No saved posts."
            : mode === "mine"
              ? "You have not shared a post yet."
              : "No posts match these filters."}
        </div>
      ) : (
        <div className={styles.list}>
          {data.items.map((post) => (
            <PostCard key={post.id + post.updated_at} post={post} />
          ))}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Discussion pages">
          <button
            className="ui-button"
            disabled={page <= 1}
            onClick={() => filter({ page: String(page - 1) })}
          >
            Previous
          </button>
          <span>
            Page {page} of {data.totalPages}
          </span>
          <button
            className="ui-button"
            disabled={page >= data.totalPages}
            onClick={() => filter({ page: String(page + 1) })}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
