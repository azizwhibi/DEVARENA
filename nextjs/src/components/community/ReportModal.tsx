"use client";
import { useEffect, useRef, useState } from "react";
import { communityError, reportCommunityContent } from "@/lib/community";
import styles from "./community.module.css";
export function ReportModal({
  postId,
  commentId,
  onClose,
}: {
  postId?: string;
  commentId?: string;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await reportCommunityContent({
        postId,
        commentId,
        reason: reason.trim(),
      });
      setSaved(true);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby="report-title"
      onCancel={onClose}
    >
      <h2 id="report-title" className="section-title">
        Report content
      </h2>
      {saved ? (
        <>
          <p className={styles.notice} role="status">
            Report sent to moderators.
          </p>
          <button className="ui-button" onClick={onClose}>
            Close
          </button>
        </>
      ) : (
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <label>
            Reason
            <textarea
              className="input"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" className="ui-button" onClick={onClose}>
              Cancel
            </button>
            <button className="ui-button ui-button-primary" disabled={busy}>
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
