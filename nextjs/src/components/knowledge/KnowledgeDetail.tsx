'use client';
import Link from 'next/link';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  apiRequest,
  errorText,
  feedbackLabels,
  recordClick,
  safeExternal,
  useKnowledge,
  type Progress,
  type Resource,
} from '@/lib/knowledge';
import {
  BookmarkButton,
  Failure,
  KnowledgeNav,
  Loading,
  ResourceMeta,
} from './KnowledgeUI';
import styles from './knowledge.module.css';
import { OfflineDownload } from './OfflineDownload';
import { LessonExplanation } from './LessonExplanation';
export function ResourceContent({
  resource,
  trackClicks = true,
}: {
  resource: Resource;
  trackClicks?: boolean;
}) {
  const external = safeExternal(resource.external_url);
  return (
    <>
      <ResourceMeta resource={resource} />
      {resource.description && (
        <p className="page-subtitle">{resource.description}</p>
      )}
      {!!resource.tags?.length && (
        <div className={styles.meta}>
          {resource.tags.map((tag) => (
            <span className="badge badge-muted" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {resource.content && (
        <div className={'card ' + styles.article}>{resource.content}</div>
      )}
      {external && (
        <a
          className="btn btn-secondary"
          href={external}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (trackClicks && resource.status === 'published')
              recordClick(resource.id);
          }}
        >
          Open source
          <WorkspaceIcon name="arrow" size={16} />
        </a>
      )}
      {(resource.source || resource.attribution) && (
        <div className={styles.meta}>
          <span>Source: {resource.source}</span>
          {resource.attribution && <span>{resource.attribution}</span>}
        </div>
      )}
    </>
  );
}
function LearningControls({
  resource,
  onSaved,
}: {
  resource: Resource;
  onSaved: () => void;
}) {
  const [percentage, setPercentage] = useState(
      resource.progress?.percentage ?? 0,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(value: number) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest<Progress>('/me/knowledge/progress/' + resource.id, {
        method: 'PATCH',
        body: JSON.stringify({ percentage: value }),
      });
      onSaved();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={'card ' + styles.progress}
      aria-label="Learning progress"
    >
      <h2 className="section-title">Learning progress</h2>
      {!resource.progress ? (
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => save(0)}
        >
          Start resource
        </button>
      ) : resource.progress.state === 'completed' ? (
        <>
          <p>
            Completed on{' '}
            {new Date(resource.progress.completed_at!).toLocaleDateString(
              'en-US',
            )}
          </p>
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => save(0)}
          >
            Resume
          </button>
        </>
      ) : (
        <>
          <label htmlFor="learning-progress">Progress: {percentage}%</label>
          <input
            id="learning-progress"
            type="range"
            min="0"
            max="99"
            step="1"
            value={percentage}
            onChange={(event) => setPercentage(Number(event.target.value))}
            disabled={busy}
          />
          <div className={styles.actions}>
            <button
              className="btn btn-secondary"
              disabled={busy || percentage === resource.progress.percentage}
              onClick={() => save(percentage)}
            >
              Save
            </button>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => save(100)}
            >
              Mark as completed
            </button>
          </div>
        </>
      )}
      <p className="muted">
        Learning progress does not change your skill scores.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
function Feedback({
  resourceId,
  recommendationId,
}: {
  resourceId: string;
  recommendationId?: string;
}) {
  const [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(feedback: string) {
    setBusy(true);
    setError('');
    try {
      await apiRequest('/me/knowledge/feedback', {
        method: 'POST',
        body: JSON.stringify({
          resource_id: resourceId,
          recommendation_id: recommendationId,
          feedback,
        }),
      });
      setSelected(feedback);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2 className="section-title">Your feedback</h2>
      <div className={styles.feedback}>
        {Object.entries(feedbackLabels).map(([key, label]) => (
          <button
            className={
              selected === key ? 'btn btn-primary' : 'btn btn-secondary'
            }
            key={key}
            aria-pressed={selected === key}
            disabled={busy}
            onClick={() => submit(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {selected && (
        <p role="status" className="muted">
          Feedback saved.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
export function KnowledgeDetail({ id }: { id: string }) {
  const query = useSearchParams();
  const recommendationId = query.get('recommendation') ?? undefined;
  const result = useKnowledge<Resource>('/knowledge/resources/' + id);
  if (result.loading)
    return (
      <div className="page-container">
        <KnowledgeNav />
        <Loading />
      </div>
    );
  if (result.error)
    return (
      <div className="page-container">
        <KnowledgeNav />
        <Failure message={result.error} retry={result.reload} />
      </div>
    );
  const resource = result.data!;
  return (
    <div className="page-container">
      <KnowledgeNav />
      <div className={styles.detail}>
        <header className="page-header">
          <h1 className="page-title">{resource.title}</h1>
          <BookmarkButton key={resource.id} resource={resource} />
        </header>
        <ResourceContent resource={resource} />
        {resource.content.trim() && <OfflineDownload id={resource.id} />}
        {resource.content.trim() && <LessonExplanation key={resource.id} id={resource.id} />}
        <LearningControls
          key={resource.progress?.updated_at ?? 'not-started'}
          resource={resource}
          onSaved={result.reload}
        />
        {!!resource.resource_skills.length && (
          <section>
            <h2 className="section-title">Related skills</h2>
            <div className={styles.actions}>
              {resource.resource_skills.map((link) => (
                <Link
                  className="btn btn-secondary"
                  key={link.skill_id}
                  href={'/skills/' + link.skill_id}
                >
                  {link.skill?.name ?? 'Skill'}
                </Link>
              ))}
            </div>
          </section>
        )}
        {!!resource.challenges?.length && (
          <section>
            <h2 className="section-title">Related challenges</h2>
            <div className={styles.actions}>
              {resource.challenges.map((challenge) => (
                <Link
                  className="btn btn-secondary"
                  key={challenge.id}
                  href={'/skills/' + challenge.skill_id}
                >
                  {challenge.title}
                </Link>
              ))}
            </div>
          </section>
        )}
        <Feedback
          resourceId={resource.id}
          recommendationId={recommendationId}
        />
      </div>
    </div>
  );
}
