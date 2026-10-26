"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  communityError,
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminModerationLogs,
  getAdminReports,
  moderateComment,
  moderatePost,
  reviewAdminReport,
  updateAdminCategory,
  type CommunityCategory,
  type CommunityReport,
  type ModerationLog,
} from "@/lib/community";
import styles from "./community.module.css";
export function AdminCommunity() {
  const [tab, setTab] = useState<"reports" | "categories" | "logs">("reports"),
    [status, setStatus] = useState("pending"),
    [categories, setCategories] = useState<CommunityCategory[]>([]),
    [reports, setReports] = useState<CommunityReport[]>([]),
    [logs, setLogs] = useState<ModerationLog[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [description, setDescription] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([
      getAdminCategories(),
      getAdminReports(status),
      getAdminModerationLogs(),
    ])
      .then(([c, r, l]) => {
        if (active) {
          setCategories(c);
          setReports(r);
          setLogs(l);
          setLoaded(true);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(communityError(e));
      });
    return () => {
      active = false;
    };
  }, [status, revision]);
  async function act(action: () => Promise<unknown>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      done?.();
      setNotice("Saved.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  async function hide(report: CommunityReport) {
    if (report.comment_id)
      await moderateComment(report.comment_id, {
        status: "hidden",
        reason: "Reported content: " + report.reason.slice(0, 450),
      });
    else if (report.post_id)
      await moderatePost(report.post_id, {
        status: "hidden",
        reason: "Reported content: " + report.reason.slice(0, 450),
      });
    await reviewAdminReport(report.id, {
      status: "reviewed",
      reviewNotes: "Content hidden after review.",
    });
  }
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1>Discuss moderation</h1>
        <Link className="ui-button" href="/community">
          Open Discuss
        </Link>
      </header>
      <nav className={styles.tabs} aria-label="Moderation sections">
        {(["reports", "categories", "logs"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === "reports"
              ? "Reports"
              : value === "categories"
                ? "Categories"
                : "Activity"}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            className="ui-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {!loaded && !error ? (
        <div
          className="skeleton skeleton-panel"
          role="status"
          aria-label="Loading moderation"
        />
      ) : tab === "reports" ? (
        <>
          <label className={styles.filters}>
            Status
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <div className={styles.list}>
            {reports.length ? (
              reports.map((report) => (
                <article
                  className={styles.card + " " + styles.report}
                  key={report.id}
                >
                  <span className="ui-label">
                    {report.comment_id ? "Comment report" : "Post report"}
                  </span>
                  <p className={styles.content}>{report.reason}</p>
                  <div className={styles.actions}>
                    <div>
                      {(report.discussion_id || report.post_id) && (
                        <Link
                          className="ui-button"
                          href={
                            "/community/" +
                            (report.discussion_id ?? report.post_id) +
                            (report.comment_id
                              ? "#comment-" + report.comment_id
                              : "")
                          }
                        >
                          Open content
                        </Link>
                      )}
                      {report.status === "pending" && (
                        <>
                          <button
                            className="ui-button"
                            disabled={busy}
                            onClick={() => void act(() => hide(report))}
                          >
                            Hide content
                          </button>
                          <button
                            className="ui-button"
                            disabled={busy}
                            onClick={() =>
                              void act(() =>
                                reviewAdminReport(report.id, {
                                  status: "dismissed",
                                  reviewNotes: "No action required.",
                                }),
                              )
                            }
                          >
                            Dismiss
                          </button>
                          <button
                            className="ui-button"
                            disabled={busy}
                            onClick={() =>
                              void act(() =>
                                reviewAdminReport(report.id, {
                                  status: "reviewed",
                                  reviewNotes:
                                    "Reviewed without hiding content.",
                                }),
                              )
                            }
                          >
                            Mark reviewed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.empty}>No {status} reports.</div>
            )}
          </div>
        </>
      ) : tab === "categories" ? (
        <>
          <form
            className={styles.form + " " + styles.card}
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () =>
                  editing
                    ? updateAdminCategory(editing, {
                        name: name.trim(),
                        slug: slug.trim(),
                        description,
                      })
                    : createAdminCategory({
                        name: name.trim(),
                        slug: slug.trim(),
                        description,
                      }),
                () => {
                  setEditing(null);
                  setName("");
                  setSlug("");
                  setDescription("");
                },
              );
            }}
          >
            <h2 className="section-title">
              {editing ? "Edit category" : "New category"}
            </h2>
            <label>
              Name
              <input
                className="input"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Slug
              <input
                className="input"
                required
                minLength={2}
                maxLength={60}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="development-notes"
              />
            </label>
            <label>
              Description
              <input
                className="input"
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              {editing && (
                <button
                  type="button"
                  className="ui-button"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setSlug("");
                    setDescription("");
                  }}
                >
                  Cancel
                </button>
              )}
              <button className="ui-button ui-button-primary" disabled={busy}>
                Save category
              </button>
            </div>
          </form>
          <div className={styles.list}>
            {categories.map((c) => (
              <article className={styles.card} key={c.id}>
                <h2 className="section-title">
                  {c.name}
                  {!c.is_active ? " · Archived" : ""}
                </h2>
                <p className={styles.muted}>{c.description}</p>
                <div className={styles.actions}>
                  <div>
                    <button
                      className="ui-button"
                      onClick={() => {
                        setEditing(c.id);
                        setName(c.name);
                        setSlug(c.slug);
                        setDescription(c.description ?? "");
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="ui-button"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          c.is_active
                            ? deleteAdminCategory(c.id)
                            : updateAdminCategory(c.id, { isActive: true }),
                        )
                      }
                    >
                      {c.is_active ? "Archive" : "Restore"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.list}>
          {logs.length ? (
            logs.map((log) => (
              <article className={styles.card} key={log.id}>
                <span className="ui-label">{log.target_type}</span>
                <p>{log.reason}</p>
                <time className={styles.muted} dateTime={log.created_at}>
                  {new Date(log.created_at).toLocaleString("en-US", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </article>
            ))
          ) : (
            <div className={styles.empty}>No moderation activity yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
