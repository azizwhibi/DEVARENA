'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiService } from '@/lib/skills/api';
import type { AdminSkill } from '@/lib/skills/types';
type Reference = { id: string; title: string };
type Developer = { id: string; username: string };
type Link = { id: string; name: string; weight: number };
export default function AssociationsPage() {
  const [skills, setSkills] = useState<AdminSkill[]>([]),
    [challenges, setChallenges] = useState<Reference[]>([]),
    [developers, setDevelopers] = useState<Developer[]>([]);
  const [developer, setDeveloper] = useState(''),
    [challenge, setChallenge] = useState(''),
    [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [s, c, d] = await Promise.all([
        ApiService.getAdminSkills(),
        ApiService.getChallenges(),
        ApiService.getDevelopers(),
      ]);
      setSkills(s);
      setChallenges(c);
      setDevelopers(d.items);
      setChallenge(c[0]?.id ?? '');
      setDeveloper(d.items[0]?.id ?? '');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Skill links unavailable.');
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
  async function find(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await ApiService.getDevelopers(search);
      setDevelopers(data.items);
      setDeveloper(data.items[0]?.id ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search unavailable.');
    }
  }
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Associations</h1>
      </header>
      {error && (
        <div role="alert" className="card">
          {error}
          <button className="btn btn-secondary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <div className="grid-2">
          <section className="card">
            <h2 className="section-title">Developer skills</h2>
            <form onSubmit={find} className="inline-form">
              <input
                aria-label="Search developers"
                maxLength={64}
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-secondary">Search</button>
            </form>
            <label>
              Developer
              <select
                className="input"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
              >
                <option value="">Select</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.username}
                  </option>
                ))}
              </select>
            </label>
            {!developers.length && <p>No developers found.</p>}
            {developer && (
              <DeveloperSkills
                key={developer}
                userId={developer}
                skills={skills}
              />
            )}
          </section>
          <section className="card">
            <h2 className="section-title">Challenge skills</h2>
            <label>
              Challenge
              <select
                className="input"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
              >
                <option value="">Select</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            {!challenges.length && <p>No challenges available.</p>}
            {challenge && (
              <ChallengeSkills
                key={challenge}
                challengeId={challenge}
                skills={skills}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function DeveloperSkills({
  userId,
  skills,
}: {
  userId: string;
  skills: AdminSkill[];
}) {
  const [assigned, setAssigned] = useState<AdminSkill[]>([]),
    [selected, setSelected] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setAssigned(await ApiService.getDeveloperSkills(userId));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignments unavailable.');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    async function initialize() {
      await load();
    }
    void initialize();
  }, [load]);
  async function change(id: string, active: boolean) {
    setBusy(true);
    setError('');
    try {
      await ApiService.setDeveloperSkill(userId, id, active);
      await load();
      setSelected('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to update the assignment.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack-form">
      <p className="muted">
        Assignments do not create scores. Removing an assignment preserves
        assessments and history.
      </p>
      {error && (
        <p role="alert">
          {error}
          <button className="btn btn-ghost" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <>
          <label>
            Skill
            <select
              className="input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select</option>
              {skills
                .filter(
                  (s) => s.isActive && !assigned.some((a) => a.id === s.id),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            disabled={busy || !selected}
            onClick={() => void change(selected, true)}
          >
            Assign
          </button>
          <ul>
            {assigned.map((s) => (
              <li key={s.id}>
                {s.name}
                {!s.isActive ? ' · Archived' : ''}
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void change(s.id, false)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {!assigned.length && <p>No assigned skills.</p>}
        </>
      )}
    </div>
  );
}
function ChallengeSkills({
  challengeId,
  skills,
}: {
  challengeId: string;
  skills: AdminSkill[];
}) {
  const [links, setLinks] = useState<Link[]>([]),
    [selected, setSelected] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      setLinks((await ApiService.getChallengeSkills(challengeId)).skills);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Skill links unavailable.');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);
  useEffect(() => {
    async function initialize() {
      await load();
    }
    void initialize();
  }, [load]);
  async function save() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await ApiService.replaceChallengeSkills(
        challengeId,
        links.map((s) => ({ skillId: s.id, weight: s.weight })),
      );
      setNotice('Links saved. Existing assessments are preserved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack-form">
      {error && (
        <p role="alert">
          {error}
          <button className="btn btn-ghost" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <>
          <label>
            Skill
            <select
              className="input"
              value={selected}
              disabled={busy}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select</option>
              {skills
                .filter((s) => s.isActive && !links.some((l) => l.id === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="btn btn-secondary"
            disabled={!selected || busy || links.length >= 10}
            onClick={() => {
              const s = skills.find((s) => s.id === selected);
              if (s)
                setLinks([...links, { id: s.id, name: s.name, weight: 1 }]);
              setSelected('');
            }}
          >
            Add to challenge
          </button>
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <span>{l.name}</span>
                <label>
                  Weight
                  <input
                    aria-label={'Weight for ' + l.name}
                    className="input"
                    type="number"
                    min={1}
                    max={3}
                    value={l.weight}
                    disabled={busy}
                    onChange={(e) =>
                      setLinks(
                        links.map((item) =>
                          item.id === l.id
                            ? { ...item, weight: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    setLinks(links.filter((item) => item.id !== l.id))
                  }
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
          {!links.length && <p>No linked skills.</p>}
          <button
            className="btn btn-primary"
            disabled={
              busy ||
              links.some(
                (l) =>
                  !Number.isInteger(l.weight) || l.weight < 1 || l.weight > 3,
              )
            }
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Save links'}
          </button>
        </>
      )}
    </div>
  );
}
