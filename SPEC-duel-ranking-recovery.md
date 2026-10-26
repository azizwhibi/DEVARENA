# Spec: duel-ranking-recovery

Status: approved by the user ("i approve") after specification review. Implementation plan approval remains pending.
Module: `duel-ranking-recovery` in `CAPABILITY-MAP-challenge-duel-recovery.md`.
Extends `SPEC-competitive-rankings.md`; does not change its scoring economy.

## Objective and assumptions

Make completed server-resolved multiplayer duels persist and update each developer's authoritative competitive standing in the configured development database. The result, profile, and rankings must agree after persistence. Errors must be visible to players rather than silently implying that ranking succeeded.

Read-only API probes returned PGRST205 for `duel_matches`, `user_rank_stats`, and `competitive_leaderboard`, and PGRST202 for `competitive_rankings`. Determine whether schema objects are physically missing or the API cache is stale before changing schema. The current service sends the match outcome before attempting persistence and logs failures without informing players.

Assumptions: preserve the current competitive formula, Elo parameters, tier rewards, public/private eligibility, and Dev Score meaning. Solo DevBot battles remain unranked. Winning can increase points without changing ordinal rank; do not promise rank advancement for every match.

## Tech stack and project structure

NestJS 11 WebSocket duel services, existing event emitter, service-role Supabase client, PostgreSQL SQL/RPCs, Next.js 16.4 and React.

- Match lifecycle: `backend/src/duel/duel-room.service.ts`, gateway/types and adjacent specs.
- Ranking reads/rewards: `backend/src/rankings/`; own profile reads in `backend/src/users/`.
- Existing prerequisites: `db/duel-integration.sql`, `db/marketplace-integration.sql`, existing baseline/profile/score migrations.
- Existing competitive migration: `supabase/migrations/20261027000001_rankings_and_rewards.sql`; SQL assertions: `supabase/tests/rankings.sql`.
- UI: `nextjs/src/components/duel/`, `src/hooks/useQuizDuel.ts`, shared account provider, profile, and rankings components; frontend regressions in `nextjs/scripts/`.
- Readiness evidence, applied migration identities, rollback/recovery instructions, and review receipts: `docs/`.

## Behavior and interface requirements

1. Inspect actual schema and migration history using trusted connection/MCP capabilities when available. Verify prerequisite tables/functions/columns and role privileges before execution. If the issue is API cache staleness, refresh the cache rather than recreating data. Read-only REST absence alone is not proof of physical absence.
2. Prepare an exact, reviewable development schema repair using existing idempotent SQL where valid. Record any new schema mutation as a timestamped idempotent migration. Preserve all existing rows and RLS/least-privilege grants. Review wallet/reward prerequisites as well as duel tables so question mastery and rank promotion do not fail after the apparent repair. Never apply production changes as part of this task.
3. Persist the server-resolved match with its original UUID, player identities, round evidence, outcome, and forfeit marker. Apply `apply_competitive_duel(p_match_id)` only to authoritative stored results. Repeated delivery/recovery of a match must not create another match, increment match counts twice, or grant duplicate rewards.
4. Preserve `round(duel_rating * 0.6 + median_dev_score * 15)` and the existing Elo defaults, K factors, floor, sweep exclusion for forfeits, and pre-match calculations. Preserve service-only SQL execution and serialized/concurrency-safe updates. Do not add raw battle points to proficiency or invent a browser score increment.
5. Distinguish match outcome from ranking persistence in the client. While the score is being saved, show a pending ranking state. A successful persisted update continues to use the matching `DUEL_RATING_UPDATED` payload. Add a narrowly scoped failure/status message if required, documenting its event shape in the plan before implementation. A write/RPC failure must resolve pending state to an actionable unavailable/failed message rather than leave a spinner or claim saved points.
6. Refresh shared account/profile and rankings reads after a successful matching update, including prefetched navigation data. Reject mismatched/old match messages. Pending/failed refresh must preserve the match outcome and authenticated account; stale responses cannot overwrite newer scores. Use the existing refresh paths rather than a second frontend ranking calculator.
7. A persisted match whose rating application failed can be recovered through the existing idempotent server processing path after readiness is restored. Do not reconstruct absent historical games from browser totals or invent results. If previous games were never saved, disclose that they cannot be recovered from the available evidence. No new durable queue or general retry framework is implied.
8. Missing ranking infrastructure must produce a visible unavailable condition or block entry into ranked play; baseline fallback values must not be presented as proof that a completed match was rated. Private users retain own points without a public rank; active public developers follow existing eligible-set ordering.

## Code style

Reuse existing service/controller boundaries and event envelopes, validated UUIDs and RFC-7807 handling. Retain comments and safety checks. Keep SQL security-definer search paths empty and identifiers qualified.

```typescript
const { data, error } = await this.supabase.client.rpc(
  'apply_competitive_duel',
  { p_match_id: room.duelId },
);
// Report sanitized status; never forward raw upstream errors or credentials.
```

No new scoring formula, package, general repository abstraction, or background job platform is required.

## Commands

Run from the repository root. Prefer the local tooling if command resolution would download a package.

```powershell
npm --prefix backend test -- duel-ranking duel-room rankings rank-reward users.service
npm --prefix backend test
npm --prefix backend run build
npm --prefix nextjs run test:auth
npm --prefix nextjs run test:duel
npx --prefix backend tsc -p backend --noEmit
npx --prefix nextjs tsc -p nextjs --noEmit
npm --prefix nextjs run build
graphify update .
git diff --check
```

Development: `npm --prefix backend run start:dev` and `npm --prefix nextjs run dev`, avoiding duplicate running servers. SQL: execute `supabase/tests/rankings.sql` through the trusted dev SQL connection after prerequisite review and repair; record the exact non-secret invocation in the plan once available connection tooling is established. Never put credentials in command text or logs.

## Testing strategy and success criteria

- Write and verify failing offline regressions for missing schema, insert failure, rating RPC failure, duplicate result delivery/recovery, concurrent matches, and pending/error/success client transitions. Preserve existing Elo/draw/forfeit/replay/security tests.
- Database readiness succeeds for the actual match table, rank statistics, competitive view, rating RPC signature, reward prerequisites, and role grants. The public API can read the expected schema after any cache refresh. Record migration identities and sanitized probe results.
- A real authenticated two-player server-resolved match creates exactly one stored result and one applied competitive result. Record sanitized before/after ratings, game counts, points, and eligible standings for both participants. Replaying the same stored match leaves counts, ratings, and credits unchanged. Verify win/loss behavior and SQL draw/forfeit assertions.
- Duel result, own profile, rankings, and reward notifications agree with the persisted state after successful processing. Test navigation to previously prefetched profile/rankings routes and old message rejection. A failed write shows failure and does not announce success or grant an award.
- Run SQL assertions in the development database, preserving existing data; inspect assertion transactions before running. Use authorized test identities, never another user's credentials. If integrated verification cannot run, identify that blocker and leave completion pending.
- Maintain the repository's >=90% coverage floor for touched controllers/services/helpers; run full suites, typechecks and clean builds. Independent test, security and code review receipts are required. Mocked persistence is insufficient to close this defect.

## Boundaries

- Always: preserve server authority, existing economy, RLS, suspension enforcement, deletion/privacy floors, and match deduplication; consult Graphify/source; scope implementation to approved todo IDs; keep raw database/Auth errors and secrets out of user output.
- Ask first: present exact hosted development migration changes for approval after preparing and validating the concrete repair, as required by the invoked specification workflow; also ask before dependencies, new schema designs, or scoring-rule changes. Existing approval covers module scope, not an unreviewed database script.
- Never: migrate production, drop existing data, disable RLS, fabricate historical matches, award solo Elo, double-count replays, silently mask failed ranking writes with baseline statistics, commit/push without the existing phase gate.

## Open questions and verification limitations

No product clarification blocks this proposed specification. Physical schema/migration history, available trusted SQL execution capability, actual reward prerequisites, and authenticated browser verification remain technical checks. No database repair or live ranking success is claimed in this specification.

## Specification review receipt

Graphify: `DuelRoomService.persistMatchResult`, room/gateway/types, ranking service/reward listener, own profile/account refresh edges. Verified current SQL prerequisites, competitive contract, and approved map evidence. Files changed: this specification, the approved capability-map status, and specification tracker entries in `todo.md`. Commands: targeted source/document reads and Graphify query. Tests/builds: not run; no application implementation in this phase. Ponytail: no packages, abstractions, application edits, or database changes. Open risks are recorded above. Human specification approval received; implementation-plan approval remains pending.
