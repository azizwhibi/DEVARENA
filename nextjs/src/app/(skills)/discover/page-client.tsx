'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { ApiService } from '@/lib/skills/api';
import type { AdminSkill } from '@/lib/skills/types';

type Technology = { id: string; name: string };
export default function DiscoverPage() {
  const account = useSkillsAccount();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [selected, setSelected] = useState<Technology | null>(null);
  const [skills, setSkills] = useState<{
    technologyId: string;
    items: AdminSkill[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skillError, setSkillError] = useState<{
    technologyId: string;
    message: string;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  const [skillRetry, setSkillRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void ApiService.getTechnologies()
      .then((items) => {
        if (active) {
          setTechnologies(items);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Unable to load technologies.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void ApiService.getTechnologySkills(selectedId)
      .then((items) => {
        if (active) {
          setSkills({ technologyId: selectedId, items });
          setSkillError(null);
        }
      })
      .catch(() => {
        if (active)
          setSkillError({
            technologyId: selectedId,
            message: 'Unable to load skills for this technology.',
          });
      });
    return () => {
      active = false;
    };
  }, [selectedId, skillRetry]);
  const visible = technologies.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const currentSkills =
    skills && skills.technologyId === selectedId ? skills.items : null;
  const currentError =
    skillError && skillError.technologyId === selectedId
      ? skillError.message
      : '';
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Technologies</h1>
        {account.role === 'admin' && (
          <Link
            href="/admin/skills?tab=technologies"
            className="btn btn-secondary"
          >
            <WorkspaceIcon name="settings" />
            Manage technologies
          </Link>
        )}
      </header>
      <label className="form-group">
        Search
        <input
          type="search"
          className="input"
          placeholder="Technology name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {loading ? (
        <div className="grid-3" role="status" aria-label="Loading technologies">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton skeleton-panel" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="card">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : !visible.length ? (
        <section className="empty-state">
          <WorkspaceIcon name="layers" />
          <h2>
            {technologies.length ? 'No results' : 'No technologies available'}
          </h2>
          <p>
            {technologies.length
              ? 'Try another name.'
              : 'Active technologies will appear after they are added.'}
          </p>
        </section>
      ) : (
        <div className="grid-3">
          {visible.map((technology) => (
            <button
              type="button"
              key={technology.id}
              className="card technology-card"
              style={{
                textAlign: 'left',
                outline:
                  selectedId === technology.id
                    ? '2px solid #A78BFA'
                    : undefined,
              }}
              aria-pressed={selectedId === technology.id}
              aria-controls="technology-skills"
              onClick={() => {
                setSelected(technology);
                setSkills(null);
                setSkillError(null);
                setSkillRetry((value) => value + 1);
              }}
            >
              <WorkspaceIcon name="layers" />
              <h2>{technology.name}</h2>
              <span className="btn btn-ghost">
                View skills
                <WorkspaceIcon name="arrow" size={16} />
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <section
          id="technology-skills"
          className="card"
          style={{ marginTop: 24 }}
          aria-labelledby="technology-skills-title"
        >
          <h2 id="technology-skills-title">Skills · {selected.name}</h2>
          {currentError ? (
            <div role="alert">
              <p>{currentError}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSkillError(null);
                  setSkills(null);
                  setSkillRetry((value) => value + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : !currentSkills ? (
            <p role="status">Loading skills…</p>
          ) : !currentSkills.length ? (
            <p>No active skills linked to this technology.</p>
          ) : (
            <ul>
              {currentSkills.map((skill) => (
                <li key={skill.id}>
                  <Link className="btn btn-ghost" href={'/skills/' + skill.id}>
                    {skill.name}
                    <WorkspaceIcon name="arrow" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
