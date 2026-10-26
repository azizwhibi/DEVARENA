# Capability map: challenge delivery and duel ranking recovery

Status: module boundaries, ranking semantics, and build order approved by the user ("i approve"). Both module specifications were subsequently approved by the user; their approved contracts are in `SPEC-practice-delivery.md` and `SPEC-duel-ranking-recovery.md`. Implementation and database mutation have not started. Existing uncommitted work is preserved.

| Module id | Responsibility | Depends on |
| --- | --- | --- |
| practice-delivery | Resolve supported, relevant questions for the published challenge catalog; align displayed questions with server grading; hide provisional fallback content on loading/error; rotate questions without repeats until the available pool is exhausted, including closing/reopening during a practice session. | Existing identity and challenge catalog |
| duel-ranking-recovery | Restore missing duel/ranking database prerequisites; persist server-resolved matches and apply Elo once; expose updated competitive points, tier, and standing consistently in duel results, profile, and rankings. | Existing identity and competitive ranking rules |

Build order: practice-delivery, then duel-ranking-recovery. These modules are independent; neither depends on the other. Their specifications will extend the existing practice/scoring and competitive-ranking contracts after map approval. Existing authentication is not being redesigned.

## Evidence collected before proposing boundaries

Read-only probes against the database configured by ignored backend environment settings, 2026-10-26:

- The exact challenge-loader projection succeeds (HTTP 200), including stored category and linked skill metadata.
- Of 104 published challenges, the current server resolver accepts 26 and rejects 78. Rejected examples include arrays, strings, stacks, trees, graphs, dynamic programming, JavaScript, and Ruby challenges. Category fallback alone is insufficient.
- `ChallengeModal.resolveBank` falls back to `NESTJS_QUESTIONS`, and its JSX renders that provisional question even when the authoritative bank request fails. This explains the unrelated NestJS interceptor prompt shown with an error.
- `seenQuestions` is component-local and resets when the modal is remounted. Rotation must be verified across reopening and across challenges sharing a bank.
- `duel_matches`, `user_rank_stats`, and `competitive_leaderboard` reads return HTTP 404 / PGRST205. The read-only `competitive_rankings` RPC probe returns HTTP 404 / PGRST202. These are absent from the configured API schema/cache; confirm physical schema and migration history before applying existing prerequisites.
- The duel service currently logs persistence/rating errors and returns, while the match result has already been delivered to the players. A displayed match completion does not prove that ranking persistence succeeded.

## Proposed acceptance direction for the module specifications

- Practice: the live published catalog is audited for usable question content and relevant subject coverage. Unsupported content is explicitly identified rather than replaced with an unrelated default question. Server selection and grading agree. No immediate repeat when alternatives exist; no repeat before pool exhaustion in the active browser practice session. Error/retry/loading states never show a playable provisional question.
- Rankings: a real, server-resolved multiplayer match is persisted in the configured development database, changes authoritative rating/competitive points according to the existing formula, and refreshes displayed standing. Duplicate processing cannot double-count. Failures are visible rather than presented as a successful ranking update. Existing historical results can be replayed only when persisted authoritative evidence exists.
- Preserve existing skill proficiency meaning, server validation, suspension enforcement, RLS, and service-role boundaries. Solo DevBot results remain excluded from competitive Elo and rewards. Public ordinal rank changes only when the new points change leaderboard order; losses/draws follow existing Elo rules.
- Verify actual configured database readiness and an integrated authenticated flow alongside offline regressions; mocked tests alone do not satisfy completion.

## Review receipt for this scope check

- Graphify consulted: `trustedBanks`, `getChallengeBankName`, `gradeChallengeAnswer`, `MeSkillsController.questionBank`, `DuelRoomService.persistMatchResult`, `RankingsService`, and their Supabase/module edges. Verified cited application and SQL sources.
- Commands: `graphify query "questionBank trustedBanks persistMatchResult RankingsService" --budget 2300`; targeted source reads; read-only Supabase projection/schema probes; published-catalog audit using the actual grading resolver. Probe results are recorded above; no credentials or user data were printed.
- Files changed this turn: this capability map only. Application code and database remain unchanged this turn. Existing earlier-turn changes were preserved.
- Tests/builds: not run during this specification scope check; no implementation claim is made.
- Ponytail check: no packages, abstractions, application edits, or schema changes introduced.
- Open risks: distinguish physically absent schema from stale API cache; establish available question content and variation per subject; verify authenticated browser flow in later implementation. The existing duel and marketplace prerequisite SQL must be reviewed before any hosted schema change.

Scope and both module specifications approved. Next gate: human review of the recovery implementation plan in `tasks/plan.md` and its T62–T72 task list in `todo.md`.
