'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import {
  apiRequest,
  difficulties,
  errorText,
  recordClick,
  types,
  type Resource,
} from '@/lib/knowledge';
import styles from './knowledge.module.css';
export function KnowledgeNav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Knowledge">
      {[
        ['/knowledge', 'Library'],
        ['/knowledge/saved', 'Saved'],
        ['/knowledge/progress', 'Progress'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          data-tour={
            href === '/knowledge/saved' ? 'knowledge-saved' : undefined
          }
          aria-current={path === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function Loading() {
  return (
    <div className="grid-2" role="status" aria-label="Loading resources">
      <div className="skeleton skeleton-panel" />
      <div className="skeleton skeleton-panel" />
    </div>
  );
}
export function Failure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="card" role="alert">
      <p>{message}</p>
      <button type="button" className="btn btn-secondary" onClick={retry}>
        <WorkspaceIcon name="refresh" />
        Retry
      </button>
    </div>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  if (count <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className="btn btn-secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {count}
      </span>
      <button
        className="btn btn-secondary"
        disabled={page >= count}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
export function ResourceMeta({ resource }: { resource: Resource }) {
  return (
    <div className={styles.meta}>
      <span>{types[resource.resource_type] ?? resource.resource_type}</span>
      <span>
        ·{' '}
        {resource.difficulty === 'unknown'
          ? 'Level not specified'
          : difficulties[resource.difficulty]}
      </span>
      {resource.technology && <span>· {resource.technology.name}</span>}
      {resource.estimated_minutes !== null && (
        <span>· {resource.estimated_minutes} min</span>
      )}
    </div>
  );
}
export function BookmarkButton({
  resource,
  onRemove,
}: {
  resource: Resource;
  onRemove?: () => void;
}) {
  const [saved, setSaved] = useState(!!resource.bookmarked),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/me/knowledge/bookmarks/' + resource.id, {
        method: saved ? 'DELETE' : 'PUT',
      });
      setSaved(!saved);
      if (saved) onRemove?.();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        aria-pressed={saved}
        disabled={busy}
        onClick={toggle}
      >
        <WorkspaceIcon name="bookmark" size={16} />
        {busy ? 'Saving…' : saved ? 'Saved' : 'Save'}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ResourceCard({
  resource,
  reason,
  recommendationId,
  onRemove,
  hideBookmark = false,
}: {
  resource: Resource;
  reason?: string;
  recommendationId?: string;
  onRemove?: () => void;
  hideBookmark?: boolean;
}) {
  return (
    <article className={'card ' + styles.resource}>
      <ResourceMeta resource={resource} />
      <h3>
        <Link
          href={
            '/knowledge/' +
            resource.id +
            (recommendationId ? '?recommendation=' + recommendationId : '')
          }
          onClick={() => recordClick(resource.id, recommendationId)}
        >
          {resource.title}
        </Link>
      </h3>
      {resource.description && <p>{resource.description}</p>}
      {reason && <p>{reason}</p>}
      {resource.resource_skills?.length > 0 && (
        <div className={styles.meta}>
          {resource.resource_skills.map((link) => (
            <Link key={link.skill_id} href={'/skills/' + link.skill_id}>
              {link.skill?.name ?? 'Skill'}
            </Link>
          ))}
        </div>
      )}
      <footer>
        <Link
          className="btn btn-ghost"
          href={
            '/knowledge/' +
            resource.id +
            (recommendationId ? '?recommendation=' + recommendationId : '')
          }
          onClick={() => recordClick(resource.id, recommendationId)}
        >
          View
          <WorkspaceIcon name="arrow" size={16} />
        </Link>
        {!hideBookmark && (
          <BookmarkButton resource={resource} onRemove={onRemove} />
        )}
      </footer>
    </article>
  );
}
