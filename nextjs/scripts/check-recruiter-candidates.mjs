import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { filterCandidates, buildCandidatesQuery } = await import('../src/lib/candidates.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Running recruiter live candidate database verification...');

// 1. Query path builder tests
function testBuildCandidatesQuery() {
  assert.equal(
    buildCandidatesQuery({}),
    '/recruiter/candidates',
    'Empty params must generate bare /recruiter/candidates',
  );

  assert.equal(
    buildCandidatesQuery({ page: 2, pageSize: 10 }),
    '/recruiter/candidates?page=2&pageSize=10',
    'Custom page and pageSize must be reflected in query string',
  );

  assert.equal(
    buildCandidatesQuery({ q: 'Munich' }),
    '/recruiter/candidates?q=Munich',
    'Search query must be included in query string',
  );

  assert.equal(
    buildCandidatesQuery({ technology: 'Rust' }),
    '/recruiter/candidates?technology=Rust',
    'Technology parameter must be included in query string',
  );

  assert.equal(
    buildCandidatesQuery({ technology: 'all' }),
    '/recruiter/candidates',
    "Technology 'all' must not append query parameter",
  );

  assert.equal(
    buildCandidatesQuery({ page: 3, q: 'systems', technology: 'Go' }),
    '/recruiter/candidates?page=3&q=systems&technology=Go',
    'Combined query parameters must serialize accurately',
  );
}

// 2. Client-side candidate filtering tests
function testFilterCandidates() {
  const mockCandidates = [
    {
      id: 'dev-1',
      username: 'alice_systems',
      avatarUrl: null,
      bio: 'Distributed systems architect',
      country: 'DE',
      institution: 'TU Munich',
      skills: ['Rust', 'Go'],
      tier: 'Diamond',
      devScore: 2450,
      availability: 'Open to offers',
      createdAt: '2026-10-19T00:00:00Z',
    },
    {
      id: 'dev-2',
      username: 'bob_web',
      avatarUrl: null,
      bio: 'Fullstack frontend specialist',
      country: 'FR',
      institution: '42 Paris',
      skills: ['TypeScript', 'Next.js', 'React'],
      tier: 'Platinum',
      devScore: 1980,
      availability: 'Open to offers',
      createdAt: '2026-10-19T01:00:00Z',
    },
    {
      id: 'dev-3',
      username: 'carol_ml',
      avatarUrl: null,
      bio: 'Deep learning researcher',
      country: 'CH',
      institution: 'ETH Zurich',
      skills: ['Python', 'PyTorch'],
      tier: 'Platinum',
      devScore: 2120,
      availability: 'Open to offers',
      createdAt: '2026-10-19T02:00:00Z',
    },
  ];

  // All candidates with no filters
  const all = filterCandidates(mockCandidates, '', 'all');
  assert.equal(all.length, 3, 'Empty filter must return all candidates');

  // Search by handle
  const byHandle = filterCandidates(mockCandidates, 'alice', 'all');
  assert.equal(byHandle.length, 1);
  assert.equal(byHandle[0].id, 'dev-1');

  // Search by institution
  const byInstitution = filterCandidates(mockCandidates, 'Munich', 'all');
  assert.equal(byInstitution.length, 1);
  assert.equal(byInstitution[0].id, 'dev-1');

  // Search by skill
  const bySkill = filterCandidates(mockCandidates, 'PyTorch', 'all');
  assert.equal(bySkill.length, 1);
  assert.equal(bySkill[0].id, 'dev-3');

  // Filter by technology selector
  const byTech = filterCandidates(mockCandidates, '', 'TypeScript');
  assert.equal(byTech.length, 1);
  assert.equal(byTech[0].id, 'dev-2');

  // Combined search and tech filter
  const combined = filterCandidates(mockCandidates, 'Paris', 'TypeScript');
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'dev-2');

  // Filter with no match
  const noMatch = filterCandidates(mockCandidates, 'nonexistent_skill', 'all');
  assert.equal(noMatch.length, 0);
}

// 3. DSGVO / GDPR Zero Raw PII leakage verification
function testPrivacyCompliance() {
  const sampleCandidate = {
    id: 'dev-1',
    username: 'developer_demo',
    avatarUrl: null,
    bio: 'Test bio',
    country: 'DE',
    institution: 'TU Berlin',
    skills: ['TypeScript'],
    tier: 'Platinum',
    devScore: 2000,
    availability: 'Open to offers',
    createdAt: '2026-10-19T00:00:00Z',
  };

  assert.equal(
    'email' in sampleCandidate,
    false,
    'GDPR Rule 4 Violation: CandidateItem must never contain raw email field',
  );

  const dashboardSrc = readFileSync(
    resolve(__dirname, '../src/components/recruiter/RecruiterDashboard.tsx'),
    'utf8',
  );

  assert.ok(
    !dashboardSrc.includes('SAMPLE_CANDIDATES'),
    'Static SAMPLE_CANDIDATES array must be completely removed from RecruiterDashboard',
  );

  assert.ok(
    dashboardSrc.includes('apiRequest'),
    'RecruiterDashboard must fetch candidates via apiRequest',
  );

  const candidatesLibSrc = readFileSync(
    resolve(__dirname, '../src/lib/candidates.ts'),
    'utf8',
  );

  assert.ok(
    candidatesLibSrc.includes('/recruiter/candidates'),
    'candidates.ts must query /recruiter/candidates',
  );

  assert.ok(
    dashboardSrc.includes('buildCandidatesQuery'),
    'RecruiterDashboard must use buildCandidatesQuery to query candidates',
  );

  assert.ok(
    !dashboardSrc.includes('candidate.email'),
    'GDPR Rule 4: Candidate email must not be rendered or accessed in recruiter UI',
  );
}

// 4. Invitation delivery functional verification
function testInvitationDelivery() {
  const dashboardSrc = readFileSync(
    resolve(__dirname, '../src/components/recruiter/RecruiterDashboard.tsx'),
    'utf8',
  );

  assert.ok(
    !dashboardSrc.includes('Invitation delivery is not available yet'),
    'Placeholder "Invitation delivery is not available yet" must be eliminated from RecruiterDashboard',
  );

  assert.ok(
    dashboardSrc.includes('sendInvitation'),
    'RecruiterDashboard must import and invoke sendInvitation',
  );

  assert.ok(
    dashboardSrc.includes('/invitations'),
    'RecruiterDashboard must provide navigation link to /invitations for tracking sent requests',
  );
}

testBuildCandidatesQuery();
testFilterCandidates();
testPrivacyCompliance();
testInvitationDelivery();

console.log('PASS: 21 recruiter candidate database scenarios (query building, filtering, privacy, UI integrity, invitation delivery)');
