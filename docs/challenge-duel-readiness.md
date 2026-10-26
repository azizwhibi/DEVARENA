# Challenge and duel recovery readiness (T62)

Plan approved by the user. Snapshot: configured development Supabase, 2026-10-26. No hosted SQL mutation performed.

## Reproducible catalog audit

`node backend/scripts/check-practice-catalog.cjs --require-complete` runs the actual TypeScript resolver against every published catalog row, paginating by ID. `--details` adds public challenge titles/categories/skill slugs and assigned bank; no environment values, user profiles or upstream error bodies are printed.

Initial expected failure: exit 1, 104 published, 26 resolved, 78 unresolved. Categories include arrays, strings, hash tables, stacks, trees, graphs, binary search, dynamic programming, matrices, windows/pointers, intervals and SQL subjects. The live challenge schema includes `description`, `problem_type`, `coding_version_id`, and `problem_slug`; there is no generic `content` column. Practice is the approved question-and-answer experience, not a new code runner.

Initial resolved distribution: SQL 21, SQL CTE 2, AI code review 2, Python 1. This includes weak subject classification that must be reviewed for relevance, not merely counted as supported. The backend builder will use exact categories and meaningful language/skill metadata before generic labels.

## Initial schema/API observations

| Probe | HTTP | Safe error code |
| --- | --- | --- |
| Exact challenge-loader projection | 200 | none |
| `duel_matches` | 404 | PGRST205 |
| `user_rank_stats` | 404 | PGRST205 |
| `competitive_leaderboard` | 404 | PGRST205 |
| Read-only `competitive_rankings` RPC | 404 | PGRST202 |

These establish API-schema unavailability, not physical table absence. The existing Supabase Management access token was detected without printing its value; a read-only SQL request returned 401. Direct database credentials/URL were not found by the schema investigator. Hosted physical schema and migration history therefore remain unverified.

PostgreSQL 16 binaries are available locally under `C:/Program Files/PostgreSQL/16/bin`. The schema investigator initialized an isolated ignored `.temp/recovery-db` database for exact repair and SQL assertion testing. Local SQL success must not be represented as hosted readiness.

## Access, identity and runtime gates

No browser/Chrome DevTools MCP is enabled. Installed browser availability and a local headless runtime path are being checked. Test identities must be dedicated authorized fixtures, kept separate from real accounts; credentials and tokens must stay in memory/ignored configuration and never appear in logs or receipts.

T67 will produce the exact development SQL repair package and locally validate it. T68 requires the user's review of that concrete package plus working trusted SQL access. Service-role REST access does not authorize arbitrary SQL execution and does not establish migration history.

## Review receipt

Graphify nodes: `trustedBanks`, `getChallengeBankName`, `ChallengeModal`, `DuelRoomService.persistMatchResult`, and their catalog/Supabase edges. Verified source projections and migration prerequisites. Files changed for T62: `backend/scripts/check-practice-catalog.cjs` and this readiness report. Command: catalog audit above, expected RED coverage failure recorded; first invocation required correcting inherited ts-node module-resolution options before the real audit ran. No raw secrets or user data emitted. No packages or schema changes. Open risks: hosted SQL authorization, full subject relevance/coverage, dedicated fixture identities and authenticated browser proof.
