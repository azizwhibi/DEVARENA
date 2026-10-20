'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api';
import {
  type CandidateItem,
  type CandidatesResponse,
  buildCandidatesQuery,
} from '@/lib/candidates';
import {
  sendInvitation,
  listSentInvitations,
  type InvitationItem,
} from '@/lib/messaging';

interface RecruiterDashboardProps {
  currentUserId: string;
  role: 'admin' | 'recruiter';
}

const POPULAR_TECHS = [
  'all',
  'TypeScript',
  'JavaScript',
  'Python',
  'Rust',
  'Go',
  'PostgreSQL',
  'React',
  'Next.js',
  'C++',
];

export function RecruiterDashboard({ role }: RecruiterDashboardProps) {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [contactedCandidates, setContactedCandidates] = useState<Record<string, boolean>>({});
  const [sentInvitations, setSentInvitations] = useState<Record<string, InvitationItem>>({});
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  const [modalCandidate, setModalCandidate] = useState<CandidateItem | null>(null);
  const [invitationMessage, setInvitationMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load sent invitations to show live status badges
  useEffect(() => {
    const controller = new AbortController();
    listSentInvitations(controller.signal)
      .then((invs) => {
        if (!controller.signal.aborted) {
          const map: Record<string, InvitationItem> = {};
          for (const inv of invs) {
            map[inv.candidateId] = inv;
          }
          setSentInvitations(map);
        }
      })
      .catch(() => {
        // non-fatal if offline/mock
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch candidates from database via backend API
  useEffect(() => {
    const controller = new AbortController();

    async function loadCandidates() {
      setLoading(true);
      setError(null);
      try {
        const queryPath = buildCandidatesQuery({
          page: 1,
          pageSize: 50,
          q: debouncedQuery,
          technology: selectedTech,
        });

        const data = await apiRequest<CandidatesResponse>(queryPath, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        setCandidates(data.items ?? []);
        setTotalCount(data.total ?? (data.items ? data.items.length : 0));
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Could not load candidates from database.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, selectedTech]);

  const handleOpenInviteModal = (candidate: CandidateItem) => {
    setModalCandidate(candidate);
    setInvitationMessage(
      `Hello @${candidate.username}, we were impressed by your DevArena profile and verified skills. We would love to connect for an interview.`,
    );
    setModalError(null);
  };

  const handleSendInvitation = async () => {
    if (!modalCandidate) return;
    setSending(true);
    setModalError(null);
    try {
      const created = await sendInvitation(modalCandidate.id, invitationMessage);
      setSentInvitations((prev) => ({ ...prev, [modalCandidate.id]: created }));
      setContactedCandidates((prev) => ({ ...prev, [modalCandidate.id]: true }));
      setContactNotice(`Interview invitation successfully sent to @${modalCandidate.username}.`);
      setModalCandidate(null);
      setTimeout(() => {
        setContactNotice(null);
      }, 5000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setModalError(err.problem?.errors?.[0] || err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError('Failed to send interview invitation.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Portal Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-800/60">
                {role === 'admin' ? 'Admin + Recruiter View' : 'Recruiter Access'}
              </span>
              <span className="text-xs text-zinc-400 font-mono">DevArena Talent Intelligence</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Recruiter Candidate Hub
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Discover and evaluate verified engineering talent queried directly from DevArena database records, validated challenge scores, and technology badges.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/messages"
              className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Messages
            </Link>
            <Link
              href="/invitations"
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Sent Invitations
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-primary"
            >
              My Profile
            </Link>
            {role === 'admin' && (
              <Link
                href="/admin/users"
                className="rounded-lg border border-purple-800/60 bg-purple-950/50 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-900/60 focus-visible:outline-2 focus-visible:outline-primary"
              >
                User Admin
              </Link>
            )}
          </div>
        </div>

        {/* Talent Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Live Talent Pool</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {loading ? '…' : `${totalCount} Developers`}
            </p>
            <p className="mt-1 text-xs text-emerald-400">Synchronized with database</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier Benchmarks</p>
            <p className="mt-1 text-2xl font-bold text-primary">Diamond / Platinum</p>
            <p className="mt-1 text-xs text-zinc-400">Verified algorithmic accuracy</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">DSGVO / GDPR Compliance</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">Privacy First</p>
            <p className="mt-1 text-xs text-zinc-400">Zero raw PII exposure</p>
          </div>
        </div>
      </div>

      {contactNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 p-4 text-sm font-medium text-emerald-300 flex items-center justify-between"
        >
          <span>✓ {contactNotice}</span>
          <button
            type="button"
            onClick={() => setContactNotice(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Talent Directory Filter & List */}
      <section aria-labelledby="talent-search-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 id="talent-search-heading" className="text-lg font-semibold text-zinc-200">
              Database Developer Search
            </h2>
            <p className="text-xs text-zinc-400">
              Query real developer profiles by tech stack, institution, biography, or handle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skill, university, or handle…"
              className="min-h-10 w-full sm:w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            />
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              aria-label="Filter by technology"
              className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="all">All Technologies</option>
              {POPULAR_TECHS.filter((t) => t !== 'all').map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTech('all');
              }}
              className="text-xs underline text-red-200 hover:text-white"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 bg-zinc-800 rounded" />
                  <div className="h-5 w-24 bg-zinc-800 rounded" />
                </div>
                <div className="h-3 w-48 bg-zinc-800/60 rounded" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-zinc-800 rounded" />
                  <div className="h-4 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Candidate Cards Grid */}
        {!loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {candidates.map((candidate) => {
              const isContacted = contactedCandidates[candidate.id];
              return (
                <div
                  key={candidate.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                          @{candidate.username}
                          {candidate.country && (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 font-mono">
                              {candidate.country}
                            </span>
                          )}
                        </h3>
                        {candidate.institution && (
                          <p className="text-xs text-zinc-400 mt-0.5">{candidate.institution}</p>
                        )}
                        {candidate.bio && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{candidate.bio}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                          {candidate.tier} · {candidate.devScore} pts
                        </span>
                        <p className="text-[11px] text-emerald-400 mt-1">{candidate.availability}</p>
                      </div>
                    </div>

                    {/* Skills Chips */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {candidate.skills && candidate.skills.length > 0 ? (
                        candidate.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-zinc-800 bg-zinc-950/80 px-2 py-0.5 text-xs text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600 italic">No technology tags listed</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="text-[11px] text-zinc-500">Live verified profile</span>
                    {sentInvitations[candidate.id]?.status === 'accepted' ? (
                      <Link
                        href="/messages"
                        className="rounded-lg bg-emerald-950/80 border border-emerald-800/80 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        Chat with Candidate →
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={isContacted || sentInvitations[candidate.id]?.status === 'pending'}
                        onClick={() => handleOpenInviteModal(candidate)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                          isContacted || sentInvitations[candidate.id]?.status === 'pending'
                            ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                            : 'bg-zinc-800 text-zinc-200 hover:bg-primary hover:text-zinc-950'
                        }`}
                      >
                        {isContacted || sentInvitations[candidate.id]?.status === 'pending'
                          ? 'Invitation Sent ✓'
                          : 'Contact Candidate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {candidates.length === 0 && (
              <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-sm text-zinc-400">
                No active developers found matching &ldquo;{searchQuery || selectedTech}&rdquo;. Try another search keyword or technology.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Invitation Composer Modal */}
      {modalCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 id="invite-modal-title" className="text-xl font-bold text-zinc-100">
              Invite @{modalCandidate.username} for Interview
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Send a personalized interview invitation request. Once accepted, you can chat in real-time.
            </p>

            {modalError && (
              <div role="alert" className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label htmlFor="invitation-note" className="block text-xs font-medium text-zinc-300">
                Invitation Message (optional)
              </label>
              <textarea
                id="invitation-note"
                rows={4}
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                maxLength={1000}
                placeholder="Describe your company or the opportunity..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              />
              <p className="text-right text-[11px] text-zinc-500">
                {invitationMessage.length} / 1000 characters
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={sending}
                onClick={() => setModalCandidate(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSendInvitation}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {sending ? 'Sending Request…' : 'Send Invitation Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
