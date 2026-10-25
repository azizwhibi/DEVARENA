'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
type Topic = { id: string; name: string; is_active: boolean };
export type EditableProblem = {
  id?: string;
  title: string;
  description: string;
  difficulty: string;
  category?: string;
  duration_seconds?: number | null;
  is_published?: boolean;
  published_at?: string | null;
  archived_at?: string | null;
  topic_links?: { topic_id: string }[];
  skill_links?: { skill_id: string; weight: number }[];
};
export function ProblemEditor({
  initial,
  topics,
  onClose,
  onSaved,
}: {
  initial: EditableProblem;
  topics: Topic[];
  onClose(): void;
  onSaved(): void;
}) {
  const [value, setValue] = useState(initial);
  const [topicIds, setTopics] = useState(
    initial.topic_links?.map((t) => t.topic_id) ?? [],
  );
  const [links, setLinks] = useState(initial.skill_links ?? []);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ skills: { id: string; name: string }[] }>(
      '/knowledge/meta',
      { signal: controller.signal },
    )
      .then((meta) => setSkills(meta.skills))
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Skill options unavailable. Existing associations will be preserved.',
          );
      });
    return () => controller.abort();
  }, []);
  async function save() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(
        '/admin/problems' + (initial.id ? '/' + initial.id : ''),
        {
          method: initial.id ? 'PATCH' : 'POST',
          body: JSON.stringify({
            title: value.title,
            description: value.description,
            difficulty: value.difficulty,
            category: value.category || '',
            duration_seconds: value.duration_seconds || null,
            topicIds,
            skills: links.map((l) => ({
              skillId: l.skill_id,
              weight: Number(l.weight),
            })),
          }),
        },
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="card problem-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="section-title">
        {initial.id ? 'Edit problem' : 'Create draft problem'}
      </h2>
      <label>
        Title
        <input
          className="input"
          required
          minLength={2}
          maxLength={200}
          value={value.title}
          onChange={(e) => setValue({ ...value, title: e.target.value })}
        />
      </label>
      <label>
        Statement
        <textarea
          className="input"
          rows={8}
          maxLength={50000}
          value={value.description}
          onChange={(e) => setValue({ ...value, description: e.target.value })}
        />
      </label>
      <div className="grid-2">
        <label>
          Difficulty
          <select
            className="input"
            value={value.difficulty}
            onChange={(e) => setValue({ ...value, difficulty: e.target.value })}
          >
            {['beginner', 'intermediate', 'advanced', 'expert'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Duration in seconds
          <input
            className="input"
            type="number"
            min={30}
            max={86400}
            value={value.duration_seconds ?? ''}
            onChange={(e) =>
              setValue({
                ...value,
                duration_seconds: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </label>
      </div>
      <label>
        Category
        <input
          className="input"
          maxLength={80}
          value={value.category ?? ''}
          onChange={(e) => setValue({ ...value, category: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>Topics</legend>
        <div className="topic-cloud">
          {topics
            .filter((t) => t.is_active || topicIds.includes(t.id))
            .map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  checked={topicIds.includes(t.id)}
                  onChange={(e) =>
                    setTopics(
                      e.target.checked
                        ? [...topicIds, t.id]
                        : topicIds.filter((id) => id !== t.id),
                    )
                  }
                />{' '}
                {t.name}
              </label>
            ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Skills</legend>
        <div className="topic-cloud">
          {skills.map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={links.some((l) => l.skill_id === s.id)}
                onChange={(e) =>
                  setLinks(
                    e.target.checked
                      ? [...links, { skill_id: s.id, weight: 1 }]
                      : links.filter((l) => l.skill_id !== s.id),
                  )
                }
              />{' '}
              {s.name}
            </label>
          ))}
        </div>
        {links.map((l) => (
          <label key={l.skill_id}>
            Weight:{' '}
            {skills.find((s) => s.id === l.skill_id)?.name ?? 'Existing skill'}
            <input
              className="input"
              type="number"
              min={1}
              max={3}
              required
              value={l.weight}
              onChange={(e) =>
                setLinks(
                  links.map((item) =>
                    item.skill_id === l.skill_id
                      ? { ...item, weight: Number(e.target.value) }
                      : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setLinks(links.filter((item) => item.skill_id !== l.skill_id))
              }
            >
              Remove association
            </button>
          </label>
        ))}
      </fieldset>
      <p className="muted">
        Published problems support Gemini code review and optional quiz practice. AI-reviewed solutions do not change verified proficiency.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="toolbar">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save problem'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
