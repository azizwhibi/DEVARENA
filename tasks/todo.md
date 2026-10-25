# Tasks: Dynamic Scoring & WebSocket Chat Fix

Plan: `tasks/plan.md` · Specs: `SPEC-scoring.md`, `SPEC-ws-chat.md` · Capability Map: `capability-map.md`

---

## Phase 11 — WebSocket Chat Fix (`ws-chat`)

### T38: Wire `MessagingModule` in `AppModule` & Add Gateway Smoke Tests
**Description:**
- In `backend/src/app.module.ts`:
  - Import `MessagingModule` from `./messaging/messaging.module`.
  - Add `MessagingModule` to the `imports` array.
- In `backend/src/messaging/messaging.gateway.spec.ts`:
  - Create integration/unit tests for `MessagingGateway` verifying:
    - Gateway hooks onto HTTP server upgrade event.
    - `/ws` connections without token or with invalid tokens get rejected with 401.
    - Authenticated connections receive `{ event: 'authenticated', data: { userId } }`.
    - `send_message` event calls `messagingService.saveMessage()` and broadcasts `new_message` to participants.
    - `typing` event broadcasts `user_typing` to the other participant.
- Verify that `backend/src/duel/duel.gateway.ts` continues to function on `/duel` without collision.
**Acceptance:**
- [x] `MessagingModule` is registered in `AppModule`.
- [x] `npm --prefix backend run build` compiles cleanly.
- [x] `MessagingGateway` unit tests pass.
- [x] Duel gateway tests continue passing.
**Verify:** `npm --prefix backend test -- messaging`; `npm --prefix backend run build`
**Files:** `backend/src/app.module.ts`, `backend/src/messaging/messaging.gateway.spec.ts`
**Scope:** S

---

## Phase 12 — Dynamic Scoring Core Cleanup (`scoring`)

### T39: Remove Static Scoring (`applyAttemptResult`) & Rewire Progress Controller
**Description:**
- In `backend/src/skills/skill-progress.service.ts`:
  - Delete `applyAttemptResult()` completely (removing hardcoded ±6% delta, default 75 starting score, inline thresholds).
- In `backend/src/skills/progress-admin.controller.ts`:
  - In `recordAttempt()`: replace call to `applyAttemptResult` with direct attempt insert into `attempts` table (`user_id`, `challenge_id`, `accuracy`, `is_validated`), then emit `ATTEMPT_VALIDATED` event so that `AttemptValidatedListener` invokes `recalculate()` for all linked skills using authoritative `computeLevel()`.
  - In `simulate()`: refactor or route through the same standard attempt record flow + `ATTEMPT_VALIDATED` emission.
- In `backend/src/skills/scoring/level.calculator.spec.ts` and `backend/src/skills/skill-progress.service.spec.ts`:
  - Add unit tests verifying `recalculate()` correctly computes levels from best attempt accuracy.
  - Verify no references to `applyAttemptResult` remain.
**Acceptance:**
- [x] `applyAttemptResult` method is completely removed from codebase.
- [x] Submitting challenge attempts strictly triggers `recalculate()` via event-driven pipeline.
- [x] Backend test suite for skills passes.
**Verify:** `npm --prefix backend test -- skills`; `grep -rn "applyAttemptResult" backend/src/` returns 0 hits.
**Files:** `backend/src/skills/skill-progress.service.ts`, `backend/src/skills/progress-admin.controller.ts`, `backend/src/skills/skill-progress.service.spec.ts`
**Scope:** M

---

## Phase 13 — Database Median View & Functions (`scoring`)

### T40: Migration for Median `dev_scores` View, `leaderboard()` & `my_rank()`
**Description:**
- Create migration `supabase/migrations/20261026000001_dev_scores_median.sql`:
  - Create view `public.dev_scores` computing:
    - `dev_score`: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usp.level_score)` (median)
    - `skill_count`: count of evaluated skills with ≥1 validated attempt
    - `score_reached_at`: `MAX(usp.updated_at)`
    - `tier`: CASE statement with thresholds (>=85 expert, >=65 advanced, >=35 intermediate, else beginner)
    - `eligible`: `(p.visibility = 'public' AND p.status = 'active' AND count(usp.skill_id) >= 1)`
    - `scoring_version`: `'median-v1'`
  - Create SQL function `public.leaderboard(p_scope text, p_value text, p_limit int, p_offset int)` returning ranked rows with `rank`, `total`, handling scopes (`global`, `country`, `institution`, `technology`).
  - Create SQL function `public.my_rank(p_user_id uuid, p_scope text, p_value text)` returning user rank in specified scope.
  - Revoke direct access from `anon, authenticated`; grant execution to `service_role`.
- Create SQL tests in `supabase/tests/scoring_median.sql` verifying:
  - Median calculation across odd [60, 80, 90] -> 80 and even [60, 80] -> 70 skill scores.
  - Users with 0 attempts have `dev_score: null, eligible: false`.
  - Private and suspended users are not returned in `leaderboard()`.
**Acceptance:**
- [x] SQL test suite passes with exact median calculations.
- [x] RLS and permissions verified.
**Verify:** Execute migration against dev Supabase / verify test assertions.
**Files:** `supabase/migrations/20261026000001_dev_scores_median.sql`, `supabase/tests/scoring_median.sql`
**Scope:** M

---

## Phase 14 — Rankings API & Profile Integration (`scoring`)

### T41: `RankingsModule` & `GET /rankings` API
**Description:**
- In `backend/src/rankings/`:
  - Create `rankings.module.ts`, `rankings.controller.ts`, `rankings.service.ts`, `dto/rankings-query.dto.ts`.
  - `RankingsController`: `GET /rankings` using `OptionalAuthGuard` (Throttled 60/min).
  - Handles scopes: `global`, `country`, `institution`, `technology`.
  - If authenticated user, queries `my_rank()` to populate `me: { rank, devScore, tier, eligible }`.
  - If anonymous, `me: null`.
  - In `backend/src/app.module.ts`: register `RankingsModule`.
- In `backend/src/rankings/rankings.service.spec.ts`:
  - Unit tests covering scopes, pagination, optional auth user ranking, anonymous view.
**Acceptance:**
- [x] `GET /rankings` returns paginated leaderboard matching `dev_scores`.
- [x] Authenticated caller gets their calculated rank.
- [x] Tests pass.
**Verify:** `npm --prefix backend test -- rankings`; `npm --prefix backend run build`
**Files:** `backend/src/rankings/rankings.module.ts`, `backend/src/rankings/rankings.controller.ts`, `backend/src/rankings/rankings.service.ts`, `backend/src/rankings/dto/rankings-query.dto.ts`, `backend/src/rankings/rankings.service.spec.ts`, `backend/src/app.module.ts`
**Scope:** M

### T42: Integrate `devScore` & `tier` into `UsersService.getProfile()`
**Description:**
- In `backend/src/users/users.service.ts`:
  - In `getProfile()`: query `dev_scores` view for `userId` to populate `devScore: Math.round(score)` and `tier`.
  - Fall back gracefully to `devScore: null, tier: null` if user has no validated attempts or view row.
- In `backend/src/users/users.service.spec.ts`:
  - Add unit test verifying `getProfile()` returns hydrated `devScore` and `tier` when present.
**Acceptance:**
- [x] `GET /me/profile` returns actual calculated median `devScore` and `tier` instead of hardcoded `null`.
- [x] Unit tests pass.
**Verify:** `npm --prefix backend test -- users`
**Files:** `backend/src/users/users.service.ts`, `backend/src/users/users.service.spec.ts`
**Scope:** S

---

## Phase 15 — Verification Checkpoint (Checkpoint K)

### T43: End-to-End Verification, Graphify Refresh & Review Receipt
**Description:**
- Run full test suite: `npm --prefix backend test`
- Run backend build: `npm --prefix backend run build`
- Run frontend auth tests: `npm --prefix nextjs run test:auth`
- Run frontend typecheck: `npx tsc -p nextjs --noEmit`
- Audit codebase for static scoring remnants.
- Refresh Graphify knowledge graph: `graphify update .`
- Emit structured Review Receipt per Rule 10 in AGENTS.md.
**Acceptance:**
- [x] All backend test suites pass.
- [x] Clean backend build.
- [x] Frontend tests and typechecks pass.
- [x] Static scoring completely eliminated.
- [x] Review receipt emitted.
**Verify:** Standard verification commands green.
**Files:** Full repo
**Scope:** S

---

## ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix
- [x] Tasks T38–T43 completed
- [x] Full test suites green
- [x] Review receipt emitted per Rule 10
- [ ] Human approval requested per Rule 11


---

## Phase 16 — Developer Invitations (`developer-invitations`)

### T44: Navigation Links, InvitationsManager Developer View & Dashboard Widget
**Description:**
- In `nextjs/src/components/AuthHeader.tsx`:
  - Show "Interview requests" (`/invitations`) and "Live messages" (`/messages`) in account dropdown for developers (`account?.role === 'developer'`).
- In `nextjs/src/components/invitations/InvitationsManager.tsx`:
  - Ensure developer role cleanly displays received invitations, recruiter details, and Accept/Decline actions with direct link to chat on accept.
- In `nextjs/src/app/(skills)/dashboard/page-client.tsx`:
  - Add an invitations summary card displaying pending recruiter requests and direct link to review.
**Acceptance:**
- [x] Developers can navigate to `/invitations` and `/messages` via the header dropdown.
- [x] Developers can review, accept, and decline recruiter invitations.
- [x] Dashboard displays an alert card when pending invitations are received.
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/AuthHeader.tsx`, `nextjs/src/components/invitations/InvitationsManager.tsx`, `nextjs/src/app/(skills)/dashboard/page-client.tsx`
**Scope:** S

---

## Phase 17 — Practice & Solo Duel Scoring (`practice-scoring`)

### T45: Backend Attempt Endpoint: `POST /me/skills/challenges/:id/attempt`
**Description:**
- In `backend/src/skills/me-skills.controller.ts`:
  - Add `POST challenges/:challengeId/attempt` with `UserGuard`.
  - Validate accuracy (`0.0 <= accuracy <= 1.0`).
  - Insert record into `attempts` table.
  - Emit `ATTEMPT_VALIDATED` event to trigger `recalculate()` for all linked skills.
- In `backend/src/skills/me-skills.controller.spec.ts`:
  - Add unit tests verifying attempt insert, event emission, and `UserGuard` protection.
**Acceptance:**
- [x] Endpoint records developer attempt and triggers `recalculate()`.
- [x] Unit tests pass.
**Verify:** `npm --prefix backend test -- me-skills`; `npm --prefix backend run build`
**Files:** `backend/src/skills/me-skills.controller.ts`, `backend/src/skills/me-skills.controller.spec.ts`
**Scope:** S

### T46: Frontend Wiring for ChallengeModal & Solo DevBot Duel
**Description:**
- In `nextjs/src/components/skills/arena/ChallengeModal.tsx`:
  - In `handleSubmit()`: call `POST /me/skills/challenges/:challengeId/attempt` with accuracy (`1.0` if correct, `0.0` if incorrect).
  - Show user feedback: `"Attempt submitted! Score updated."`
  - Dispatch `skill-progress-updated` event.
- In `nextjs/src/hooks/useQuizDuel.ts` & `nextjs/src/components/duel/DuelArena.tsx`:
  - When solo DevBot practice duel completes (`phase === 'finished'`), submit attempt with battle accuracy.
**Acceptance:**
- [x] Completing a practice challenge records attempt and triggers dynamic recalculation.
- [x] Completing a solo DevBot duel records attempt and updates scores.
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/skills/arena/ChallengeModal.tsx`, `nextjs/src/hooks/useQuizDuel.ts`, `nextjs/src/components/duel/DuelArena.tsx`
**Scope:** M

---

## Phase 18 — Score & Tier Visibility (`user-scores-ui`)

### T47: Median Dev Score in useSkillSummary, Dashboard & Profile
**Description:**
- In `nextjs/src/components/skills/useSkillSummary.ts`:
  - Compute median `devScore` across evaluated skills and determine `tier`.
- In `nextjs/src/app/(skills)/dashboard/page-client.tsx`:
  - Update score card to "Dev Score & Tier", displaying median score and tier badge.
- In `nextjs/src/components/profile/ProfileProgress.tsx`:
  - Render "Dev Score (Median)" and tier badge.
**Acceptance:**
- [x] Developer dashboard displays official Median Dev Score and Tier.
- [x] Profile displays Median Dev Score and Tier.
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/skills/useSkillSummary.ts`, `nextjs/src/app/(skills)/dashboard/page-client.tsx`, `nextjs/src/components/profile/ProfileProgress.tsx`
**Scope:** S

---

## Phase 19 — Verification Gate (Checkpoint L)

### T48: Full Regression Suite, Typechecks & Review Receipt
**Description:**
- Run full backend tests: `npm --prefix backend test`
- Run backend build: `npm --prefix backend run build`
- Run frontend auth tests: `npm --prefix nextjs run test:auth`
- Run frontend typecheck: `npx tsc -p nextjs --noEmit`
- Emit structured Review Receipt per Rule 10 in AGENTS.md.
**Acceptance:**
- [x] All test suites green.
- [x] Clean builds.
- [x] Review receipt emitted.
**Verify:** Standard verification commands green.
**Files:** Full repo
**Scope:** S

---

## ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations
- [x] Tasks T44–T48 completed
- [x] Full test suites green
- [x] Review receipt emitted per Rule 10
- [x] Human approval received

---

## Phase 20 — Recruiter Candidate Invitation Delivery (`invitation-delivery`)

### T49: Specification for Candidate Invitation Delivery
**Description:**
- Author `SPEC-invitation-delivery.md` covering objective, commands, structure, code style, testing strategy, boundaries, and success criteria.
**Acceptance:**
- [x] `SPEC-invitation-delivery.md` is authored and references live backend endpoints.
**Verify:** File exists and reviewed.
**Files:** `SPEC-invitation-delivery.md`
**Scope:** S

### T50: Wire `sendInvitation` into `RecruiterDashboard.tsx`
**Description:**
- In `nextjs/src/components/recruiter/RecruiterDashboard.tsx`:
  - Import `sendInvitation` from `@/lib/messaging`.
  - Replace static `handleContact` with asynchronous `handleInvite(candidate)`.
  - Add loading state `invitingId` to indicate invitation dispatch in progress.
  - Set positive feedback banner: `"Invitation sent to @username! Track status in Interview Requests."` with a direct link to `/invitations`.
  - Gracefully handle HTTP 409 `invitation_duplicate` when an invitation is already pending.
  - Update candidate card action button to show `"Invited"` state when contacted.
  - Dispatch `invitation-sent` event on window for real-time reactivity.
**Acceptance:**
- [x] Recruiter clicking invite calls `sendInvitation(candidate.id)`.
- [x] Placeholder text `"Invitation delivery is not available yet"` is completely removed.
- [x] Loading and success states are displayed.
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/recruiter/RecruiterDashboard.tsx`
**Scope:** S

### T51: Automated Verification Tests in `check-recruiter-candidates.mjs`
**Description:**
- In `nextjs/scripts/check-recruiter-candidates.mjs`:
  - Add test asserting that `RecruiterDashboard.tsx` imports and uses `sendInvitation`.
  - Assert that `"Invitation delivery is not available yet"` does not appear anywhere in `RecruiterDashboard.tsx`.
**Acceptance:**
- [x] `npm --prefix nextjs run test:auth` runs `check-recruiter-candidates.mjs` and passes all assertions.
**Verify:** `npm --prefix nextjs run test:auth`
**Files:** `nextjs/scripts/check-recruiter-candidates.mjs`
**Scope:** S

### T52: Full Verification Gate (Checkpoint M)
**Description:**
- Run backend tests: `npm --prefix backend test -- invitations`
- Run frontend auth tests: `npm --prefix nextjs run test:auth`
- Run frontend typecheck: `npx tsc -p nextjs --noEmit`
- Run backend typecheck: `npx tsc -p backend --noEmit`
- Refresh Graphify knowledge graph (`graphify update .`)
- Emit structured Review Receipt per Rule 10 in AGENTS.md.
**Acceptance:**
- [x] All test suites green.
- [x] Clean typechecks.
- [x] Review receipt emitted.
**Verify:** Standard verification commands green.
**Files:** Full repo
**Scope:** S

---

## ✅ Checkpoint M — Recruiter Candidate Invitation Delivery
- [x] Tasks T49–T52 completed
- [x] Full test suites green
- [x] Review receipt emitted per Rule 10
- [ ] Human approval requested per Rule 11
