'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api';
import { sendInvitation } from '@/lib/messaging';
import {
  type CandidateItem,
  type CandidatesResponse,
  buildCandidatesQuery,
} from '@/lib/candidates';

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
  const [contactedCandidates, setContactedCandidates] = useState<
    Record<string, boolean>
  >({});
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  const [modalCandidate, setModalCandidate] = useState<CandidateItem | null>(null);
  const [invitationMessage, setInvitationMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const handleContact = (candidate: CandidateItem) => {
    setModalCandidate(candidate);
    setModalError(null);
    setInvitationMessage(
      `Hello @${candidate.username}, we discovered your profile on DevArena and would like to invite you for an interview.`,
    );
  };

  const handleSendInvitation = async () => {
    if (!modalCandidate || sending) return;
    setSending(true);
    setModalError(null);
    try {
      await sendInvitation(
        modalCandidate.id,
        invitationMessage.trim() || undefined,
      );
      setContactedCandidates((prev) => ({
        ...prev,
        [modalCandidate.id]: true,
      }));
      setContactNotice(
        `Invitation sent to @${modalCandidate.username}! Track status in Interview Requests.`,
      );
      setModalCandidate(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('invitation-sent'));
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setContactedCandidates((prev) => ({
          ...prev,
          [modalCandidate.id]: true,
        }));
        setContactNotice(
          `An active invitation already exists for @${modalCandidate.username}.`,
        );
        setModalCandidate(null);
      } else {
        setModalError(
          err instanceof Error
            ? err.message
            : 'Could not deliver invitation. Please retry.',
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Portal Header */}
      <div className="rounded-2xl border border-[#252C3A] bg-[#0F141D] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-800/60">
                {role === 'admin'
                  ? 'Admin + Recruiter View'
                  : 'Recruiter Access'}
              </span>
              <span className="text-xs text-zinc-400 font-mono">DevArena</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Candidate hub
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Find developers by technology, institution, or profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/invitations"
              className="rounded-lg border border-zinc-700 bg-[#151925] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Interview Requests
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-zinc-700 bg-[#151925] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-primary"
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
        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-[#252C3A] bg-[#090C11] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#A1AABD]">
              Live Talent Pool
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {loading ? '…' : `${totalCount} Developers`}
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              Matching your filters
            </p>
          </div>
        </div>
      </div>

      {contactNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 p-4 text-sm font-medium text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>✓ {contactNotice}</span>
            <Link
              href="/invitations"
              className="text-xs underline text-emerald-400 hover:text-emerald-200 ml-2"
            >
              View in Interview Requests →
            </Link>
          </div>
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
            <h2
              id="talent-search-heading"
              className="text-lg font-semibold text-zinc-200"
            >
              Find developers
            </h2>
            <p className="text-xs text-zinc-400"></p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skill, university, or handle…"
              className="min-h-10 w-full sm:w-64 rounded-lg border border-zinc-700 bg-[#090C11] px-3 text-sm text-zinc-100 placeholder:text-[#A1AABD] outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            />
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              aria-label="Filter by technology"
              className="min-h-10 rounded-lg border border-zinc-700 bg-[#090C11] px-3 text-sm text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
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
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            aria-busy="true"
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-xl border border-[#252C3A] bg-[#0F141D] p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 bg-[#151925] rounded" />
                  <div className="h-5 w-24 bg-[#151925] rounded" />
                </div>
                <div className="h-3 w-48 bg-[#151925]/60 rounded" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-[#151925] rounded" />
                  <div className="h-4 w-16 bg-[#151925] rounded" />
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
                  className="rounded-xl border border-[#252C3A] bg-[#0F141D] p-5 transition-colors hover:border-zinc-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                          @{candidate.username}
                          {candidate.country && (
                            <span className="rounded bg-[#151925] px-1.5 py-0.5 text-xs text-zinc-400 font-mono">
                              {candidate.country}
                            </span>
                          )}
                        </h3>
                        {candidate.institution && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {candidate.institution}
                          </p>
                        )}
                        {candidate.bio && (
                          <p className="text-xs text-[#A1AABD] mt-1 line-clamp-2">
                            {candidate.bio}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-[#C4B5FD] border border-primary/20">
                          {candidate.tier} · {candidate.devScore} pts
                        </span>
                        <p className="text-[11px] text-emerald-400 mt-1">
                          {candidate.availability}
                        </p>
                      </div>
                    </div>

                    {/* Skills Chips */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {candidate.skills && candidate.skills.length > 0 ? (
                        candidate.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-[#252C3A] bg-[#090C11] px-2 py-0.5 text-xs text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#A1AABD] italic">
                          No technology tags listed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between border-t border-[#252C3A] pt-3">
                    <span className="text-[11px] text-[#A1AABD]">
                      Developer profile
                    </span>
                    <button
                      type="button"
                      disabled={isContacted}
                      onClick={() => handleContact(candidate)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                        isContacted
                          ? 'bg-[#151925]/50 text-[#A1AABD] cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {isContacted ? 'Invited' : 'Invite candidate'}
                    </button>
                  </div>
                </div>
              );
            })}

            {candidates.length === 0 && (
              <div className="col-span-full rounded-xl border border-[#252C3A] bg-[#0F141D] p-8 text-center text-sm text-zinc-400">
                No active developers found matching &ldquo;
                {searchQuery || selectedTech}&rdquo;. Try another search keyword
                or technology.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Invitation Dialog Modal */}
      {modalCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invitation-dialog-title"
          onClick={() => !sending && setModalCandidate(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#252C3A] bg-[#0F141D] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#252C3A] pb-3">
              <h2
                id="invitation-dialog-title"
                className="text-lg font-semibold text-zinc-100"
              >
                Send Interview Invitation
              </h2>
              <button
                type="button"
                disabled={sending}
                onClick={() => setModalCandidate(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-zinc-300">
                Inviting{' '}
                <strong className="text-white">
                  @{modalCandidate.username}
                </strong>
                {modalCandidate.tier && (
                  <span className="ml-2 text-xs text-primary font-medium">
                    ({modalCandidate.tier} · {modalCandidate.devScore} pts)
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-400">
                When the developer accepts, a direct real-time chat channel will
                automatically connect both participants.
              </p>
            </div>

            {modalError && (
              <div
                role="alert"
                className="rounded-lg bg-red-950/60 border border-red-800/80 p-3 text-xs text-red-300"
              >
                {modalError}
              </div>
            )}

            <div>
              <label
                htmlFor="invitation-message"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Personalized Note (Optional)
              </label>
              <textarea
                id="invitation-message"
                rows={3}
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                disabled={sending}
                className="w-full rounded-lg border border-[#252C3A] bg-[#090C11] p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Introduce your team or specify the role you are hiring for…"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => setModalCandidate(null)}
                className="rounded-lg border border-zinc-700 bg-[#151925] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSendInvitation}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {sending ? 'Sending invitation…' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
