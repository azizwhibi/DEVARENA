'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiService, type AdminTechnology } from '@/lib/skills/api';
import type { AdminSkill } from '@/lib/skills/types';
import { SkillFormModal } from '@/components/skills/admin/SkillFormModal';
import { StatsModal } from '@/components/skills/admin/StatsModal';
export default function AdminPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState(
    params.get('tab') === 'technologies' ? 'technologies' : 'skills',
  );
  const [skills, setSkills] = useState<AdminSkill[]>([]),
    [techs, setTechs] = useState<AdminTechnology[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [q, setQ] = useState('');
  const [skillForm, setSkillForm] = useState<{ skill?: AdminSkill } | null>(
      null,
    ),
    [stats, setStats] = useState<AdminSkill | null>(null);
  const [editing, setEditing] = useState<AdminTechnology | null>(null),
    [name, setName] = useState(''),
    [icon, setIcon] = useState('');
  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        ApiService.getAdminSkills(),
        ApiService.getAdminTechnologies(true),
      ]);
      setSkills(s);
      setTechs(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Catalogue unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    async function initialize() {
      await load();
    }
    void initialize();
  }, [load]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await load();
      setNotice('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  async function saveTech(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await run(async () => {
      if (editing)
        await ApiService.updateTechnology(editing.id, {
          name: name.trim(),
          icon: icon.trim(),
        });
      else
        await ApiService.createTechnology({
          name: name.trim(),
          icon: icon.trim(),
        });
      setEditing(null);
      setName('');
      setIcon('');
    });
  }
  const visibleSkills = skills.filter((s) =>
    [s.name, s.category, s.technology]
      .join(' ')
      .toLocaleLowerCase()
      .includes(q.toLocaleLowerCase()),
  );
  const visibleTechs = techs.filter((t) =>
    t.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  return (
    <div className="page-container" aria-busy={loading || busy}>
      <header className="page-header">
        <h1 className="page-title">Skills and technologies</h1>
        {tab === 'skills' && (
          <button className="btn btn-primary" onClick={() => setSkillForm({})}>
            New skill
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="workspace-alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <nav className="tabs" aria-label="Catalogue">
        <button
          aria-pressed={tab === 'skills'}
          onClick={() => {
            setTab('skills');
            setQ('');
          }}
        >
          Skills
        </button>
        <button
          aria-pressed={tab === 'technologies'}
          onClick={() => {
            setTab('technologies');
            setQ('');
          }}
        >
          Technologies
        </button>
      </nav>
      <label>
        Search
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {loading ? (
        <p role="status">Loading catalogue…</p>
      ) : tab === 'skills' ? (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Category</th>
                <th>Technology</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSkills.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.category}</td>
                  <td>{s.technology || '—'}</td>
                  <td>{s.isActive ? 'Active' : 'Archived'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => setSkillForm({ skill: s })}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setStats(s)}
                      >
                        Statistics
                      </button>
                      {s.isActive ? (
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Remove this skill from the catalogue? Links, results, and history will be preserved.',
                              )
                            )
                              void run(() => ApiService.deleteSkill(s.id));
                          }}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              ApiService.toggleSkillActive(s.id, true),
                            )
                          }
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleSkills.length && (
                <tr>
                  <td colSpan={5}>No skills.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <form className="card stack-form" onSubmit={saveTech}>
            <h2 className="section-title">
              {editing ? 'Edit technology' : 'New technology'}
            </h2>
            <label>
              Name
              <input
                required
                minLength={2}
                maxLength={60}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Icon (optional)
              <input
                maxLength={50}
                className="input"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
            </label>
            <div className="row-actions">
              <button
                className="btn btn-primary"
                disabled={busy || name.trim().length < 2}
              >
                Save
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditing(null);
                    setName('');
                    setIcon('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>Technology</th>
                  <th>Skills</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTechs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.skillCount ?? 0}</td>
                    <td>{t.is_active ? 'Active' : 'Archived'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditing(t);
                            setName(t.name);
                            setIcon(t.icon ?? '');
                          }}
                        >
                          Edit
                        </button>
                        {t.is_active ? (
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Remove this technology from the catalogue? Skills and history will be preserved.',
                                )
                              )
                                void run(() =>
                                  ApiService.deleteTechnology(t.id),
                                );
                            }}
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                ApiService.toggleTechnologyActive(t.id, true),
                              )
                            }
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleTechs.length && (
                  <tr>
                    <td colSpan={4}>No technologies.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {skillForm && (
        <SkillFormModal
          key={skillForm.skill?.id ?? 'new'}
          skill={skillForm.skill}
          onClose={() => setSkillForm(null)}
          onSuccess={() => {
            void load();
            setNotice('Skill saved.');
          }}
        />
      )}
      {stats && (
        <StatsModal
          skillId={stats.id}
          skillName={stats.name}
          onClose={() => setStats(null)}
        />
      )}
    </div>
  );
}
