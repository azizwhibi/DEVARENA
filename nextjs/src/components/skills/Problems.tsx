'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { ChallengeModal } from './arena/ChallengeModal';
import { usePracticeSummary } from './usePracticeSummary';
import { useCodeReviewSummary } from './useCodeReviewSummary';
import { ProblemSolver } from './code/ProblemSolver';
import './problems.css';
import { ProblemEditor, type EditableProblem } from './ProblemEditor';
type Topic = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  problemCount: number;
};
type Problem = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  is_published: boolean;
  solved: boolean;
  topics: Topic[];
};
type Catalogue = {
  items: Problem[];
  total: number;
  page: number;
  pageSize: number;
};
const levels: Record<string, string> = {
  beginner: 'Easy',
  intermediate: 'Medium',
  advanced: 'Hard',
  expert: 'Expert',
};
export function Problems({ admin = false }: { admin?: boolean }) {
  return (
    <Suspense fallback={<p role="status">Loading problems…</p>}>
      <Content admin={admin} />
    </Suspense>
  );
}
function Content({ admin }: { admin: boolean }) {
  const { summary: practiceSummary } = usePracticeSummary();
  const { summary: codeSummary } = useCodeReviewSummary();
  const params = useSearchParams(),
    router = useRouter();
  const [data, setData] = useState<Catalogue | null>(null),
    [topics, setTopics] = useState<Topic[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false),
    [topicSearch, setTopicSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Topic> | null>(null);
  const [practice, setPractice] = useState<Problem | null>(null);
  const [problemEdit, setProblemEdit] = useState<EditableProblem | null>(null);
  const base = admin ? '/admin/problems' : '/problems';
  const solvingId = params.get('problem');
  function openProblem(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set('problem', id); else next.delete('problem');
    router.replace('?' + next.toString(), { scroll: false });
  }
  const q = params.get('q') ?? '',
    difficulty = params.get('difficulty') ?? '',
    topic = params.get('topic') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = new URLSearchParams({
    q,
    difficulty,
    page: String(page),
    pageSize: '20',
  });
  if (topic) query.set('topic', topic);
  const queryString = query.toString();
  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<Catalogue>(base + '?' + queryString),
      apiRequest<Topic[]>(base + '/topics'),
    ])
      .then(([catalogue, tags]) => {
        if (active) {
          setData(catalogue);
          setTopics(tags);
          setError('');
        }
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setError(e instanceof Error ? e.message : 'Unable to load problems.');
        }
      });
    return () => {
      active = false;
    };
  }, [base, queryString, revision]);
  function filter(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(values)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in values)) next.delete('page');
    setData(null);
    router.replace('?' + next.toString(), { scroll: false });
  }
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await action();
      setNotice('Saved.');
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  const visibleTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase()),
  );
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Problems</h1>
        {admin && (
          <button
            className="btn btn-primary"
            onClick={() =>
              setProblemEdit({
                title: '',
                description: '',
                difficulty: 'beginner',
              })
            }
          >
            Create problem
          </button>
        )}
        {admin && (
          <button
            className="btn btn-primary"
            onClick={() => setEditing({ name: '', slug: '', is_active: true })}
          >
            Create topic
          </button>
        )}
      </header>
      {error && (
        <div className="workspace-alert" role="alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {problemEdit && (
        <ProblemEditor
          key={problemEdit.id ?? 'new'}
          initial={problemEdit}
          topics={topics}
          onClose={() => setProblemEdit(null)}
          onSaved={() => {
            setProblemEdit(null);
            setNotice('Problem saved.');
            setRevision((v) => v + 1);
          }}
        />
      )}
      <p className="muted">
        Submit code for a Gemini review. A score of 90% or higher marks it solved (AI-reviewed).
      </p>
      {admin && (
        <section className="card">
          <label className="filter-label">
            Search topics
            <input
              className="input"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
            />
          </label>
          <div className="topic-cloud">
            {visibleTopics.map((t) => (
              <button
                className="btn btn-secondary"
                key={t.id}
                onClick={() => setEditing(t)}
              >
                {t.name}
                {t.is_active ? '' : ' · Archived'}
              </button>
            ))}
          </div>
          {!visibleTopics.length && <p>No topics found.</p>}
        </section>
      )}
      {editing && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(async () => {
              await apiRequest(
                base + '/topics' + (editing.id ? '/' + editing.id : ''),
                {
                  method: editing.id ? 'PATCH' : 'POST',
                  body: JSON.stringify({
                    name: editing.name,
                    slug: editing.slug,
                    is_active: editing.is_active,
                  }),
                },
              );
              setEditing(null);
            });
          }}
        >
          <h2>{editing.id ? 'Edit topic' : 'Create topic'}</h2>
          <label className="filter-label">
            Name
            <input
              className="input"
              required
              minLength={2}
              maxLength={80}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="filter-label">
            Slug
            <input
              className="input"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={editing.is_active}
              onChange={(e) =>
                setEditing({ ...editing, is_active: e.target.checked })
              }
            />{' '}
            Active (uncheck to archive)
          </label>
          <div className="toolbar">
            <button className="btn btn-primary" disabled={busy}>
              Save topic
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="card" aria-label="Filter by topic">
        <h2 className="ui-label">Published problems by topic</h2>
        <div className="topic-cloud">
          <button
            className="topic-chip"
            aria-pressed={!topic}
            onClick={() => filter({ topic: '' })}
          >
            All topics
          </button>
          {(expanded ? topics : topics.slice(0, 12))
            .filter((t) => t.is_active)
            .map((t) => (
              <button
                className="topic-chip"
                aria-pressed={topic === t.id}
                key={t.id}
                onClick={() => filter({ topic: topic === t.id ? '' : t.id })}
              >
                {t.name}
                <span>{t.problemCount}</span>
              </button>
            ))}
        </div>
        {topics.length > 12 && (
          <button
            className="btn btn-ghost"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Show all topics'}
          </button>
        )}
      </section>
      <form
        className="toolbar"
        key={q + difficulty}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          filter({
            q: String(form.get('q') ?? ''),
            difficulty: String(form.get('difficulty') ?? ''),
          });
        }}
      >
        <label className="filter-label">
          Search problems
          <input
            className="input"
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder="Title or description"
          />
        </label>
        <label className="filter-label">
          Difficulty
          <select className="input" name="difficulty" defaultValue={difficulty}>
            <option value="">All difficulties</option>
            {Object.entries(levels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary">Search</button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => filter({ q: '', difficulty: '', topic: '' })}
        >
          Clear filters
        </button>
      </form>
      {!data && !error ? (
        <div
          role="status"
          aria-label="Loading problems"
          className="skeleton skeleton-panel"
        />
      ) : (
        data && (
          <>
            <p className="muted">
              {data.total} problems{admin ? ' (including unpublished)' : ''}
            </p>
            {!data.items.length ? (
              <section className="empty-state">
                <h2>No problems found</h2>
                <p>Try another filter.</p>
              </section>
            ) : (
              <div className="problem-list">
                {data.items.map((problem, index) => (
                  <article className="problem-row" key={problem.id}>
                    <span className="muted">
                      {(page - 1) * 20 + index + 1}.
                    </span>
                    <div>
                      <button
                        className="problem-title"
                        onClick={() => openProblem(problem.id)}
                      >
                        {problem.title}
                      </button>
                      <div className="topic-cloud">
                        {problem.topics.map((t) => (
                          <button
                            key={t.id}
                            className="topic-chip"
                            onClick={() => filter({ topic: t.id })}
                          >
                            {t.name}
                            {t.is_active ? '' : ' · Archived'}
                          </button>
                        ))}
                      </div>
                      {admin && !problem.is_published && (
                        <span className="badge">Unpublished</span>
                      )}
                    </div>
                    <span className="badge">
                      {levels[problem.difficulty] ?? problem.difficulty}
                    </span>
                    <span className="muted">
                      {problem.solved
                        ? 'Validated'
                        : codeSummary?.solvedProblemIds.includes(problem.id)
                          ? 'Solved (AI-reviewed)'
                        : practiceSummary?.completedProblemIds.includes(
                              problem.id,
                            )
                          ? 'Practice completed'
                          : 'Not completed'}
                    </span>
                    {!admin && <button className="btn btn-ghost problem-quiz" onClick={() => setPractice(problem)} aria-label={'Practice quiz: ' + problem.title}>Quiz</button>}
                    {admin && (
                      <div className="problem-admin-actions toolbar">
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError('');
                            setNotice('');
                            try {
                              setProblemEdit(
                                await apiRequest<EditableProblem>(
                                  base + '/' + problem.id,
                                ),
                              );
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : 'Unable to open this problem.',
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            void mutate(() =>
                              apiRequest(
                                base +
                                  '/' +
                                  problem.id +
                                  (problem.is_published
                                    ? '/archive'
                                    : '/publish'),
                                { method: 'POST' },
                              ),
                            )
                          }
                        >
                          {problem.is_published
                            ? 'Archive'
                            : 'Publish / restore'}
                        </button>
                        {!problem.is_published && (
                          <button
                            className="btn btn-secondary"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Delete this draft? Referenced or previously published problems must be archived.',
                                )
                              )
                                void mutate(() =>
                                  apiRequest(base + '/' + problem.id, {
                                    method: 'DELETE',
                                  }),
                                );
                            }}
                          >
                            Delete draft
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            <nav className="toolbar" aria-label="Problem pagination">
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => filter({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(data.total / 20))}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page * 20 >= data.total}
                onClick={() => filter({ page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          </>
        )
      )}
      {practice && (
        <ChallengeModal
          challengeId={practice.id}
          challengeTitle={practice.title}
          problemDescription={practice.description ?? undefined}
          difficulty={
            practice.difficulty === 'beginner'
              ? 'easy'
              : practice.difficulty === 'intermediate'
                ? 'medium'
                : 'hard'
          }
          onClose={() => setPractice(null)}
        />
      )}
      {solvingId && <ProblemSolver key={solvingId} problemId={solvingId} onClose={() => openProblem(null)} />}
    </div>
  );
}
