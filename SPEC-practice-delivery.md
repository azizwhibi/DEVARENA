# Spec: practice-delivery

Status: approved by the user ("i approve") after specification review. Implementation plan approval remains pending.
Module: `practice-delivery` in `CAPABILITY-MAP-challenge-duel-recovery.md`.
Extends the existing practice/scoring contract; the current competitive-ranking restrictions take precedence over older client-reported scoring examples.

## Objective and assumptions

Make practice challenges load relevant questions, accept answers using the same authoritative question source, and rotate questions across attempts and modal reopening. Preserve the current question-and-answer experience; this repair does not introduce an arbitrary code execution service.

The live audit found 104 published challenges, 78 of which the current bank resolver rejects. The modal displays a provisional NestJS question beneath the error. Its question history is local to one mount. These defects require catalog coverage and state changes, rather than another generic retry message.

Assumptions: every currently published challenge must be playable with relevant supported content; a browser practice session includes closing/reopening the modal and moving between arena and skill practice routes. Rotation need not persist across full reload, tabs, or devices. One-question pools cannot provide variation and must show an explicit exhaustion state instead of silently repeating.

## Tech stack and project structure

NestJS 11, TypeScript, existing Supabase PostgreSQL integration; Next.js 16.4 App Router and React. Reuse the existing authenticated API helper and question UI.

- Backend selection/grading: `backend/src/skills/me-skills.controller.ts`, `backend/src/skills/scoring/challenge-grading.ts`.
- Backend tests: adjacent `*.spec.ts`, including `competitive-attempts.spec.ts`.
- UI: `nextjs/src/components/skills/arena/ChallengeModal.tsx`; entry routes in `nextjs/src/app/(skills)/arena/` and `skills/[id]/`.
- Frontend regressions: `nextjs/scripts/check-practice-loading.mjs`, `check-competitive-results.mjs`, and narrowly scoped rotation scenarios in that scripts directory.
- Catalog coverage evidence and final review receipt: `docs/`. Add files only when needed to keep the question source and rotation logic understandable.

## Behavior and interface requirements

1. Audit the entire published catalog using server-owned title, category, linked skills, and available authored content. Establish explicit subject coverage for all 104 current challenges, including JavaScript, Ruby, arrays, strings, stacks, trees, graphs, and dynamic programming. Do not classify by accidental substrings in identifiers or use NestJS as a universal fallback.
2. Prefer usable challenge-specific content. When the existing topic-bank mechanism is used, the selected bank must be relevant to that challenge. Do not claim content coverage merely because an unrelated bank resolves. Keep the selection and grading rules in agreement; no copy of a new answer key with different behavior in the client.
3. Preserve `GET /me/skills/challenges/:challengeId/question-bank` and `POST /me/skills/challenges/:challengeId/attempt` as the existing integration boundaries. Retain their current response/request fields where possible. Any additive contract needed for question identity or coverage is documented during planning before edits; it must not expose server grading secrets. Only server-validated submissions can award mastery or progression.
4. Render authoritative question content only after successful loading. During loading, failure, or timeout, hide the provisional prompt, snippet, options, and answer/reset actions. Show a loading state or a useful error/retry action. Reject unknown banks and unpublished/missing challenges safely. Preserve the existing bounded loading wait and cancellation of stale requests.
5. Rotation uses stable question identity and tracks already displayed questions for the relevant available pool. Next-question actions, modal reopening, and moving between challenges that share the same pool must not repeat a question before exhaustion. Different pools must not consume each other's history. Scope any persisted history to the signed-in account; do not retain credentials or submitted answers.
6. At exhaustion, explain that all available questions were seen and offer an explicit restart. A restart clears the relevant pool history; avoid an immediate repeat when another question is available. A singleton pool shows exhaustion after its one question. Do not clear rotation history merely because an API request retries or the modal remounts.
7. A retry recovers a failed load without closing the modal or resetting other pools. A cancelled/older request cannot replace a newer challenge's content. Keep actual answer submission locked until the selected question is authoritative.

## Code style

Follow the surrounding TypeScript formatting and existing module boundaries. Keep selection and grading explicit, retain RFC-7807 handling and validated DTOs, and avoid unrelated formatting changes.

```typescript
if (!challenge.is_published) {
  throw new NotFoundException('Challenge not found.');
}
// The same server-owned subject/content resolution must govern selection and grading.
```

No new question framework, generic state manager, package, or code runner is required by this specification.

## Commands

Run from the repository root; focused commands are used for Red/Green and full gates for completion.

```powershell
npm --prefix backend test -- competitive-attempts challenge-grading
npm --prefix backend test
npm --prefix backend run build
npm --prefix nextjs run test:auth
npm --prefix nextjs run test:skills
npm --prefix nextjs run test:practice
npx --prefix backend tsc -p backend --noEmit
npx --prefix nextjs tsc -p nextjs --noEmit
npm --prefix nextjs run build
graphify update .
git diff --check
```

Development: `npm --prefix backend run start:dev` and `npm --prefix nextjs run dev`, checking existing processes before starting duplicates. Consult bundled Next documentation before changing component/router conventions.

## Testing strategy and success criteria

- Verify failing Jest and frontend runtime regressions before implementation. Cover the user's error-with-NestJS-prompt reproduction, title/category/skill classification, unknown subjects, bank/answer mismatch rejection, and unpublished challenges.
- Audit all 104 current published challenges against the actual configured database and produce a coverage report: zero unresolved or irrelevant assignments. Add deterministic offline fixtures for subject categories rather than relying solely on a network test. If the catalog changes, audit the new total as well.
- For every supported pool with N questions, verify N distinct displays before exhaustion, including reopening and same-pool challenge navigation. Verify isolation between pools/accounts, explicit restart, singleton handling, and retries. Use deterministic randomness in tests.
- Runtime scenarios cover success, HTTP failure, stalled request, retry recovery, invalid response, unmount, and a challenge switch while loading. No question/options are visible until readiness; server grading accepts the displayed valid question and rejects cross-pool submissions.
- Verify authenticated arena and skill-page browser flows against the configured backend/database: open affected challenges, answer, close/reopen, rotate, exhaust, and restart. Capture sanitized request status and UI evidence without tokens or personal data.
- Maintain the repository's >=90% coverage floor for touched controllers/services/helpers. Run full tests, builds, and typechecks; independent test/security/code reviewers provide receipts. Offline tests alone do not establish completion.

## Boundaries

- Always: preserve authentication, suspension enforcement, server grading, RFC-7807, request cancellation, and existing validated-attempt ordering. Map implementation to approved todo task IDs and consult Graphify/source before structural changes.
- Ask first: dependency additions, a new schema requirement, changing the answer experience beyond existing question-and-answer practice, or expanding history to cross-device persistence. Present concrete changes for review before applying any hosted schema mutation.
- Never: enable an unrelated fallback to pass coverage, trust browser-reported success for rewards, leak secrets, remove failing tests, mutate published content silently, or mark live verification complete from mocks.

## Open questions and verification limitations

No product clarification blocks this proposed specification. Whether existing authored content is directly reusable, the exact subject-pool inventory, and browser tooling availability remain implementation evidence to gather. Unsupported future/admin-created content must show a deliberate unavailable state; that is not an acceptable substitute for fixing the current 104-challenge catalog.

## Specification review receipt

Graphify: `ChallengeModal`, `trustedBanks`, bank selection/grading, `MeSkillsController`, arena and skill practice entry points. Sources verified against the approved map and existing contracts. Files changed: this specification, the approved capability-map status, and the specification tracker entries in `todo.md`. Commands: targeted source/document reads and Graphify query. Tests/builds: not run; no application implementation in this phase. Ponytail: no packages, abstractions, application edits, or database changes. Open risks are recorded above. Human specification approval received; implementation-plan approval remains pending.
