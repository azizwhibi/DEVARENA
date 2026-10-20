'use client';

import Link from 'next/link';
import { useState } from 'react';

interface RecruiterDashboardProps {
  currentUserId: string;
  role: 'admin' | 'recruiter';
}

export function RecruiterDashboard({ role }: RecruiterDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('all');

  const SAMPLE_CANDIDATES = [
    {
      id: 'c1',
      username: 'alex_systems',
      tier: 'Diamond',
      devScore: 2420,
      skills: ['Rust', 'Go', 'Distributed Systems'],
      country: 'DE',
      institution: 'TU Munich',
      availability: 'Open to offers',
    },
    {
      id: 'c2',
      username: 'sarah_fullstack',
      tier: 'Platinum',
      devScore: 1980,
      skills: ['TypeScript', 'Next.js', 'PostgreSQL'],
      country: 'FR',
      institution: 'École 42 Paris',
      availability: 'Ready for interview',
    },
    {
      id: 'c3',
      username: 'elena_ml',
      tier: 'Platinum',
      devScore: 2150,
      skills: ['Python', 'PyTorch', 'FastAPI'],
      country: 'US',
      institution: 'Stanford University',
      availability: 'Exploring roles',
    },
    {
      id: 'c4',
      username: 'marcus_sec',
      tier: 'Gold',
      devScore: 1650,
      skills: ['C++', 'Cryptography', 'Linux Kernel'],
      country: 'CH',
      institution: 'ETH Zurich',
      availability: 'Contract only',
    },
  ];

  const filteredCandidates = SAMPLE_CANDIDATES.filter((c) => {
    const matchesSearch =
      !searchQuery.trim() ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.institution.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTech =
      selectedTech === 'all' ||
      c.skills.some((s) => s.toLowerCase() === selectedTech.toLowerCase());
    return matchesSearch && matchesTech;
  });

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
              Discover and evaluate verified engineering talent through live code-arena achievements, validated challenge scores, and technology badges.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Talent Pool</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">40+ Candidates</p>
            <p className="mt-1 text-xs text-emerald-400">Verified through coding arena</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier Benchmarks</p>
            <p className="mt-1 text-2xl font-bold text-primary">Diamond / Platinum</p>
            <p className="mt-1 text-xs text-zinc-400">Top 10% algorithmic scorers</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">DSGVO / GDPR Compliance</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">Privacy First</p>
            <p className="mt-1 text-xs text-zinc-400">Zero raw PII exposure</p>
          </div>
        </div>
      </div>

      {/* Talent Directory Filter & List */}
      <section aria-labelledby="talent-search-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 id="talent-search-heading" className="text-lg font-semibold text-zinc-200">
              Verified Candidate Search
            </h2>
            <p className="text-xs text-zinc-400">
              Filter candidates by technology stack, university/institution, or username.
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
              <option value="TypeScript">TypeScript</option>
              <option value="Python">Python</option>
              <option value="Rust">Rust</option>
              <option value="Go">Go</option>
              <option value="C++">C++</option>
            </select>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                    {candidate.username}
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 font-mono">
                      {candidate.country}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{candidate.institution}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                    {candidate.tier} · {candidate.devScore} pts
                  </span>
                  <p className="text-[11px] text-emerald-400 mt-1">{candidate.availability}</p>
                </div>
              </div>

              {/* Skills Chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-zinc-800 bg-zinc-950/80 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <span className="text-xs text-zinc-500">Validated algorithmic accuracy</span>
                <button
                  type="button"
                  onClick={() => alert(`Contact request initiated for candidate @${candidate.username}`)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-primary hover:text-zinc-950 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Contact Candidate
                </button>
              </div>
            </div>
          ))}
          {filteredCandidates.length === 0 && (
            <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-sm text-zinc-400">
              No candidates found matching &ldquo;{searchQuery}&rdquo;. Try another skill or keyword.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
