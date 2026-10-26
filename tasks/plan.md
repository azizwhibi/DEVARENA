# Implementation Plans: DevArena

## Active extension: Battle Score-Margin Ranking Adjustment & Persistence (`battle-margin-ranking`)

Status: specification approved by the user ("i approve") in `SPEC-battle-margin-ranking.md`. Implementation plan and task breakdown submitted for user review.

Specs: [`SPEC-battle-margin-ranking.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-battle-margin-ranking.md) (extends [`SPEC-competitive-rankings.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-competitive-rankings.md) and [`SPEC-duel-ranking-recovery.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-duel-ranking-recovery.md)). Tasks: T73–T77 in `todo.md` under Checkpoint P.

### Architecture & Concrete Boundaries

1. **SQL Margin-of-Victory Logic in `apply_competitive_duel(p_match_id uuid)`:**
   - Computes `v_score_diff := abs(coalesce(m.player1_score, 0) - coalesce(m.player2_score, 0))`.
   - Margin multiplier for winner:
     - If not forfeit and `v_score_diff >= 5000`: `v_margin_mult = 1.50` (+50% bonus).
     - Else if not forfeit and `v_score_diff >= 2500`: `v_margin_mult = 1.25` (+25% bonus).
     - Else: `v_margin_mult = 1.00`.
   - Winner delta: `round(v_ka * (1.0 - v_expected) * v_margin_mult)::int`.
   - Loser delta (asymmetric protection): `round(v_kb * (0.0 - (1.0 - v_expected)))::int` (no blowout loss multiplier), floored at 800 Elo.
   - Forfeits / disconnects: Multiplier locked at 1.00.
   - Emits margin bonus info in return JSON: `{ applied, player_a, player_b, delta_a, delta_b, rating_a, rating_b, points_a, points_b, margin_bonus_a, margin_bonus_b }`.

2. **Backend Persistence & Event Dispatch in `DuelRoomService`:**
   - Calls `apply_competitive_duel(p_match_id: room.duelId)`.
   - Forwards `marginBonus` (`0 | 25 | 50`) in the `DUEL_RATING_UPDATED` WebSocket payload so players see their bonus.
   - Ensures fallback calculation parity in `rankings.service.ts` (`fallbackRankings`).

3. **Frontend Presentation in `DuelResultModal.tsx` & `RankingsBoard.tsx`:**
   - `DuelResultModal` displays points change (`+delta` / `-delta`) and special victory badges ("🔥 Blowout Bonus (+50%)" or "⚡ Dominant Win (+25%)").
   - `/rankings` leaderboard table and `MyStanding` card reflect the newly updated rating and competitive points immediately.

### Dependency Graph & Execution Order
```text
T73 SQL RPC apply_competitive_duel with margin multiplier & assertions
  -> T74 Backend DuelRoomService persistence, types & event payload
  -> T75 Frontend DuelResultModal & duelState margin display
  -> T76 Frontend RankingsBoard / MyStanding verified display
  -> T77 Full test suites, typechecks, Graphify sync & review receipt (Checkpoint P)
```

---

## Active extension: challenge delivery and duel ranking recovery

Status: implementation plan/task list approved by the user; capability map and both module specifications already approved. This extends the existing practice/scoring and score-visibility work. Historical plans below, including invitation work, are preserved. The approved recovery specifications and current competitive-ranking contract supersede historical client-reported/solo competitive-scoring examples.

Specs: `SPEC-practice-delivery.md`, `SPEC-duel-ranking-recovery.md`. Scope map: `CAPABILITY-MAP-challenge-duel-recovery.md`. Tasks are tracked only in root `todo.md` (T62–T72). One recovery phase, Checkpoint O; intermediate checks below are automated verification gates, not phase advancement or permission to commit/push.

### Architecture and concrete boundaries

Practice: retain the existing controller URLs and validated answer submission `{question, answerId}`. Use a single server-owned question definition for new/updated playable content, returning a public projection without answer keys. Extend the existing question-bank response additively from `{bank}` to `{bank, questions:[{question,codeSnippet,hint,options:[{id,text}]}]}`. Stable rotation identity is the bank plus exact unique prompt, validated for duplicates. Grading resolves the same authoritative bank/content; existing attempt response fields remain, with optional post-submission explanation if needed to preserve feedback. The browser must not receive `isCorrect` or grading answers with the loading response. Existing offline demo behavior must remain explicitly unranked.

Reuse usable authored content when its schema supports this question-and-answer UI; do not build a code runner or relabel coding tasks as supported without relevant questions. Audit the actual current catalog before selecting the precise category mapping. Add subject pools for genuinely missing topics; each current playable subject needs at least two distinct relevant questions to provide variation. Existing pools can retain their content through a mechanical move into server-owned definitions when necessary, with parity tests. Do not rewrite unrelated question prose or add a generic content system.

Rotation: one small account-scoped session-history helper shared by the two practice entry flows, using non-sensitive bank/prompt identifiers. Browser `sessionStorage` may retain only those identifiers across route remounts; no auth tokens, answers, or PII. Read/write failures fall back to memory. Exhaustion and explicit restart belong to the practice UI. Clear or namespace state on account changes. Do not record a question until authoritative content is actually displayed.

Duels: retain `DUEL_MATCH_END` as the outcome and matching `DUEL_RATING_UPDATED` as persisted success. Add `{type:'DUEL_RATING_STATUS',payload:{duelId,status:'pending'|'failed',code?:'match_save_failed'|'rating_apply_failed'|'ranking_unavailable'}}`. Codes are sanitized constants, never upstream error messages. Pending starts when an online outcome arrives; failed status terminates pending; successful rating updates clear failure for that same match. Ignore statuses for another match or solo mode. Connection loss or bounded wait must terminate pending with an unavailable message without claiming whether a possibly completed database write succeeded; refresh authoritative reads on recovery. Use existing auth/WebSocket paths, not a new queue or transport.

Persistence recovery reuses the original match UUID and validates the stored participants/outcome before treating duplicate insertion as an existing authoritative match. A stored unrated match can be processed again through the existing server rating path. An unsaved historical game cannot be recovered without evidence. Preserve the existing SQL formula, concurrency locks, idempotent result/reward records, privacy eligibility, and deletion behavior.

### Dependencies and execution order

```text
T62 live catalog/schema readiness evidence
  -> T63 authoritative public question contract
  -> T64 missing subject coverage
  -> T65 load/error rendering
  -> T66 session rotation
  -> automated practice proof
  -> T67 concrete dev schema repair package
  -> explicit review of exact hosted SQL before execution
  -> T68 apply approved dev repair and prove SQL readiness
  -> T69 server persistence/status/recovery
  -> T70 client ranking status and refresh
  -> T71 authenticated integrated proof
  -> T72 final gates and independent receipts (Checkpoint O)
```

Execution refinement: prepare and verify T69/T70 against T67's locally validated SQL while hosted T68 approval/access is pending, so the final hosted approval reviews concrete working application changes. T71 still requires hosted T68 and cannot be closed locally. No additional product scope is added.

Each implementation slice follows verified Red → minimal Green → review. Builders own slices; independent test-engineer, security-auditor, and code-reviewer roles verify them. Non-overlapping content fixtures/tests may be delegated in parallel after the provider contract is established. API/type mutations, database changes, task updates, and deployment are sequential. Do not start another module/phase merely because a mocked test passed.

### Verification and runtime evidence

Focused commands are listed per task. Full completion gates:

```powershell
npm --prefix backend test
npm --prefix backend run build
npm --prefix nextjs run test:auth
npm --prefix nextjs run test:practice
npm --prefix nextjs run test:duel
npm --prefix nextjs run test:skills
& ./backend/node_modules/.bin/tsc.cmd -p backend --noEmit
& ./nextjs/node_modules/.bin/tsc.cmd -p nextjs --noEmit
npm --prefix nextjs run build
graphify update .
git diff --check
```

Start/reuse the backend and frontend on existing configured ports. Authenticated browser practice proof must cover previously failing subjects, same-pool navigation/reopening, exhaustion, retry, grading, and account separation. Ranking proof requires two authorized test identities playing through the real server pipeline and recording sanitized before/after ratings/counts/points and matching stored result evidence. Preserve the >=90% coverage floor for touched controllers/services/helpers; use targeted coverage reporting without weakening assertions or thresholds.

SQL execution is a tool-readiness gate: currently no Supabase SQL MCP or `psql` command is available in this session; a Supabase CLI is installed, but connection/management authorization has not been established. T62 discovers existing trusted access without printing environment values or assuming REST credentials can execute SQL. T67 records the exact safe invocation if available. Otherwise, prepare the complete SQL and verification package and report the concrete missing access at the hosted execution gate. Never claim T68 or T71 passed based on REST schema probes or mocks.

### Risks and mitigation

| Risk | Evidence and mitigation |
| --- | --- |
| Incomplete/misclassified content | Audit 104 current published rows, linked skills, category, and authored schema; review a subject-to-pool matrix and unique prompts, not just resolver success. Repeat audit if the catalog changes. |
| Leaking grading keys through new content response | Public projection allowlist; tests assert no correctness keys; grading remains server-owned. |
| Repeats or stale loading responses | Account/pool-scoped identity history, deterministic runtime tests, stale request cancellation, explicit exhaustion/restart. |
| Missing schema versus stale API cache | Establish physical schema/migration evidence when possible; never infer physical absence solely from PGRST205/PGRST202. |
| Incomplete reward prerequisites | Inspect duel, wallet/ledger, mastery, profile and Dev Score dependencies before composing the existing migration scripts. |
| Destructive or partial hosted repair | Idempotent timestamped SQL, retained rows/RLS, transaction boundaries and rollback/recovery notes; exact script approval before execution. |
| Duplicate/lost rating application | Stable match ID, stored evidence checks, SQL persistent deduplication and replay assertions; failures visible to players. |
| No integrated verification tooling or identities | Discover access early and disclose the precise missing capability; leave runtime acceptance pending instead of substituting mocked claims. |

### Plan review receipt

Graphify consulted: question selection/grading and modal entry flows; duel persistence, event/types, ranking/account dependencies. Sources checked: approved specs/map, existing DTOs/event envelopes, SQL prerequisites/assertions, historical plan, and root tracker. Files changed: this plan extension, root task list, and approval statuses in the map/specs. No implementation, dependencies, schema mutation, or unrelated history removal. Commands: Graphify query, targeted source/tool-availability reads, and `git diff --check -- tasks/plan.md todo.md` (passed). Tests/builds: not run for planning. Independent reviewer found no blocking scope, contract, dependency or task-size gap; the stale specification-approval footer wording they flagged was corrected. Open risks: actual content/schema inventory, trusted SQL capability, test identities, and browser verification. Human plan/task approval received in a subsequent turn; implementation is authorized within the documented boundaries.

---

# Historical plan: Developer Invitations, Practice Scoring & Score Visibility

**Specs:** [`SPEC-developer-invitations.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-developer-invitations.md) · [`SPEC-practice-scoring.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-practice-scoring.md) · [`SPEC-user-scores-ui.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-user-scores-ui.md)  
**Capability Map:** [`capability-map-scores-and-invitations.md`](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map-scores-and-invitations.md)  
**Status:** **PROPOSED (Awaiting Human Approval)** · **Checkpoint Gate: Checkpoint L**

---

## 1. Overview & Objectives

1. **Developer Invitations (`developer-invitations`):** Make recruiter outreach visible to developers by adding navigation links, an alert banner on the dashboard, and a clean Accept/Decline interface with live chat redirection.
2. **Practice & Solo Duel Scoring (`practice-scoring`):** Ensure that developer activity from practice challenges and solo DevBot duels records verified attempts and dynamically recalculates skill levels and the overall Median Dev Score.
3. **Score Visibility (`user-scores-ui`):** Replace all outdated arithmetic averages with the authoritative Median Dev Score and Tier badge across the dashboard, profile, and header.

---

## 2. Dependency Graph & Vertical Slices

```
[developer-invitations]
T44: Navigation Links, InvitationsManager Developer View & Dashboard Widget
  │
  ▼
[practice-scoring: Backend]
T45: POST /me/skills/challenges/:id/attempt Endpoint & Unit Tests
  │
  ▼
[practice-scoring: Frontend]
T46: Wire ChallengeModal & Solo DevBot Duel to Attempt Submission
  │
  ▼
[user-scores-ui: Frontend]
T47: Median Dev Score in useSkillSummary, Dashboard Score Card & Profile
  │
  ▼
[Verification Gate]
T48: Full Regression Suites, Typechecks & Review Receipt (Checkpoint L)
```

---

## 3. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Unauthenticated users submitting challenge attempts | High | Guard `POST /me/skills/challenges/:id/attempt` strictly with `UserGuard`, reading `userId` directly from `req.user.id`. |
| Out-of-bounds accuracy values | Med | Clamp `accuracy` strictly between `0.0` and `1.0` in the backend endpoint. |
| Inconsistent median calculation between client and SQL view | Med | Replicate exact PostgreSQL median logic in `useSkillSummary.ts`: sort ascending, pick middle element or average of two middle elements. |

---

## 4. Verification Checkpoint (Checkpoint L)

- Backend Tests: `npm --prefix backend test` (all suites green).
- Backend Build: `npm --prefix backend run build` (0 errors).
- Frontend Auth Suite: `npm --prefix nextjs run test:auth` (all scenarios passing).
- Frontend Typecheck: `npx tsc -p nextjs --noEmit` (0 errors).
- Practice Challenge: Submitting check answer records attempt and emits `ATTEMPT_VALIDATED`.
- Developer Invitations: Accessible from `/invitations` with Accept/Decline working for developers.
- Score Display: Dashboard and Profile render "Dev Score: X · [Tier] Tier".

---

## 5. Phase 20: Recruiter Candidate Invitation Delivery (`invitation-delivery`)

**Spec:** [`SPEC-invitation-delivery.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-invitation-delivery.md)  
**Status:** **PROPOSED (Checkpoint M)**

### Objectives
Replace the placeholder notice in `RecruiterDashboard.tsx` with live invitation dispatching using `sendInvitation(candidate.id, message)` from `@/lib/messaging`.

### Vertical Slice & Tasks
```
[invitation-delivery]
T49: Specification for Candidate Invitation Delivery (SPEC-invitation-delivery.md)
  │
  ▼
T50: Wire sendInvitation in RecruiterDashboard with loading, duplicate handling, & UI feedback
  │
  ▼
T51: Automated Test Assertions in scripts/check-recruiter-candidates.mjs
  │
  ▼
T52: Full Verification Gate & Review Receipt (Checkpoint M)
```

