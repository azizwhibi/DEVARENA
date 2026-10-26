# Development duel-ranking repair package (T67)

Status: prepared and locally verified; exact hosted execution approval and working hosted SQL access remain required. No hosted mutation has been performed.

Target: development project `qorlygdcfwnrrzvzulcz` only. Do not run against production.

## Evidence and access

Read-only REST probes show PGRST205 for match/ranking relations and PGRST202 for the competitive read RPC. These establish absence from the API schema/cache, not physical absence. The exact challenge-loader query succeeds. Additional probes also find `dev_scores` absent from the API (PGRST205) and legacy `leaderboard` / `my_rank` functions absent (PGRST202). Wallet, profile and attempt-metadata projections succeed (HTTP 200).

`SUPABASE_ACCESS_TOKEN` exists in the process environment, but the authenticated Management API read-only SQL probe returned HTTP 401; its body and token were omitted from output. Neither a database password nor direct database URL is configured in the checked environment. No Supabase SQL MCP tool is available. Hosted physical schema and migration history therefore remain unverified.

PostgreSQL 16 tools exist under `C:/Program Files/PostgreSQL/16/bin`, despite not being on PATH. A new isolated cluster at ignored `.temp/recovery-db`, loopback port 55464, was used for verification; existing `.local/identity-db` was left untouched. This cluster is disposable and contains synthetic local fixtures only. The investigator left the owned local cluster running temporarily for independent reviewer reruns; stop it after review with `pg_ctl.exe -D .temp/recovery-db stop`. Local PostgreSQL 16 does not replace required verification on the project's hosted PostgreSQL 17 baseline.

## Exact proposed repair

File: `supabase/migrations/20261028000001_recover_duel_rankings.sql`. Final reviewed-file SHA-256: `f30d245594272daf0ba84e3ceef117b921f17a158e391c558abb8944812c2b84`.

The file contains one transaction, a 10-second lock timeout and 60-second statement timeout. It:

1. Checks required baseline profile/attempt/challenge/skill/progress columns. Missing prerequisites abort with a named error before any committed change.
2. Checks existing wallet/ranking table shapes; existing wallet UUID/integer/timestamptz types, non-null balance/timestamp, primary key, cascading profile foreign key and validated balance-floor/ceiling constraints are checked explicitly. An incompatible namesake aborts rather than overwriting history. If another credit-storage model exists without the expected wallet table, explicit mapping is required.
3. Adds only the existing canonical wallet prerequisite used by rank rewards (`credit_wallets`), preserving the same nonnegative/one-million ceiling, foreign key, RLS and service-only privileges. It does not import Marketplace catalog, purchases or user balances.
4. Restores the existing median Dev Score view and legacy ranking functions, then includes the existing duel integration definition and competitive definitions. Nested transaction statements are removed so the whole repair commits atomically. The two legacy SECURITY DEFINER search paths are changed from `public` to empty (all table references are already qualified). Their global-branch `round` operands are cast to `numeric`, fixing the existing `round(double precision, integer)` error while preserving the median view type; technology branches already produce numeric values. Final competitive revokes remove the legacy public grants before commit. Existing match/rating/reward rows are preserved. The formula, Elo locks, match deduplication, mastery first-clear and milestone reward semantics are unchanged.
5. Sends a PostgREST schema-reload notification only on successful transaction commit.

Source provenance:

| Source | SHA-256 before inclusion |
| --- | --- |
| `supabase/migrations/20261026000001_dev_scores_median.sql` | `4d63067aaa4c552b637c0b20dccfb1b49b8c3f68c2af586ceae3b0d32810ca33` |
| `db/duel-integration.sql` | `af413e0abea150da13dcd6bc9a18ea82e6504735ca58dda79f2d179985f58355` |
| `db/marketplace-integration.sql` (wallet prerequisite only) | `823c8fbebbbfa65163396abf5e2e8931d1097ef8d6ea465f974f9df70229ab34` |
| `supabase/migrations/20261027000001_rankings_and_rewards.sql` | `4f367069d7613efda443c5640b979f635763851ab70e46646022fd1cbb03db92` |

Review the exact final migration file, not a reconstruction of the older scripts. Any subsequent edit requires a new checksum and review before hosted execution.

## Required hosted preflight

Use an authenticated development SQL connection or the development SQL Editor. Inspect physical schema, migration history, and existing column types/constraints/grants. This read-only inventory is a starting point:

```sql
select current_database(), current_user;
select x as relation, to_regclass('public.' || x) as physical_object
from unnest(array[
  'profiles','attempts','challenges','skills','user_skill_progress','dev_scores',
  'credit_wallets','duel_matches','user_rank_stats','user_rank_rewards',
  'competitive_duel_results','attempt_mastery_rewards','competitive_leaderboard'
]) x;
select x as signature, to_regprocedure(x) as physical_function
from unnest(array[
  'public.leaderboard(text,text,integer,integer)',
  'public.my_rank(uuid,text,text)',
  'public.apply_competitive_duel(uuid)',
  'public.grant_attempt_mastery(uuid)',
  'public.check_and_grant_rank_reward(uuid)',
  'public.competitive_rankings(text,text,text,integer,integer,uuid)'
]) x;
select version from supabase_migrations.schema_migrations order by version;
```

If all intended objects already exist with the correct definitions and privileges, use only `notify pgrst, 'reload schema';` after reviewing that finding; do not run a repair merely to fix a stale cache. If baseline tables/profile fields are missing or incompatible, stop and prepare a concrete prerequisite repair before executing this package. Missing median/legacy ranking objects are handled by this reviewed migration. `create table if not exists` cannot repair arbitrary incompatible preexisting column types/constraints; inspect them rather than treating a column-name check as full compatibility proof.

After exact-file approval, execute the reviewed migration in the SQL Editor for the verified development project, or through an authorized SQL connection. With PostgreSQL connection environment variables provisioned privately, the non-secret file invocation is:

```powershell
& 'C:/Program Files/PostgreSQL/16/bin/psql.exe' -v ON_ERROR_STOP=1 -f supabase/migrations/20261028000001_recover_duel_rankings.sql
```

The shell environment must already contain the intended development connection settings and any necessary password/SSL configuration. Do not put credentials in command text. That connection is not currently available, so this invocation has not been run against hosted development. Do not attempt SQL through a service-role PostgREST credential; it does not authorize arbitrary SQL execution.

## Local verification and results

The first local fixture used the repository baseline and median-score migration with expected profile fields, but started without wallet/duel/competitive tables. A second isolated database (`recovery_missing_scores`) started with only baseline tables/profile fields, reproducing missing median and legacy functions too; the final recovery restored every required object and passed the same assertions.

```powershell
& 'C:/Program Files/PostgreSQL/16/bin/psql.exe' -h 127.0.0.1 -p 55464 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/rankings.sql
```

RED: exited 1 with `ASSERTION FAILED: duel RPC exists` before recovery.

```powershell
& 'C:/Program Files/PostgreSQL/16/bin/psql.exe' -h 127.0.0.1 -p 55464 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261028000001_recover_duel_rankings.sql
& 'C:/Program Files/PostgreSQL/16/bin/psql.exe' -h 127.0.0.1 -p 55464 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/rankings.sql
& 'C:/Program Files/PostgreSQL/16/bin/psql.exe' -h 127.0.0.1 -p 55464 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f .temp/recovery-verify.sql
```

GREEN: migration and all 3 existing assertions passed. Fourteen additional assertions in the ignored local-only fixture passed: ordinary win/loss Elo 1220/1180, one played game each, competitive points 1332 at proficiency 40, match replay rejected without stat changes, Bronze+Silver milestone credits 350 awarded once, beginner first-clear mastery 150 awarded once, private table/function privileges, and competitive read-RPC agreement. All six new wallet/duel/rank/reward tables report RLS enabled.

The migration was executed again after those local fixtures. The existing match result count remained 1, wallet balance 350, and winner stats `1220 / 1 game / 150 mastery`. No resets or duplicate grants occurred. A third isolated database with an existing wallet lacking balance safety constraints rejected the migration before any committed change; its balance stayed 350 and no partial duel table was created. These synthetic local fixture writes must never be copied into a hosted database as an execution prerequisite.

The updated `supabase/tests/rankings.sql` contains three structural assertions plus execution checks for all four legacy global/technology function branches, optional eligible own-score agreement and preservation of the median double-precision view type. It ends with explicit `rollback;`, so it is safe in a retained SQL session. The legacy regression first failed with SQLSTATE 42883 and passed after the two numeric casts. A fresh `recovery_final` local database passed the complete migration, regression assertions without fixtures, fourteen behavioral assertions, migration replay and assertions with fixtures; result count1, wallet350 and stats1220/1/150 were preserved. Direct legacy calls returned40.00 in global and technology branches. Stronger authenticated live-match evidence is still required by T71.

## Rollback and post-execution proof

Any migration failure before commit rolls back the whole repair, including the cache notification. Do not manually drop committed wallet/match/ranking tables as rollback; those may already contain real balances/results. For an unexpected committed behavior, stop ranked entry and use a forward corrective migration based on saved schema/privilege evidence. Back up existing definitions/grants through the trusted SQL connection before replacing them.

After hosted execution, rerun physical-object/function/privilege probes, schema-cache REST reads and the read RPC. Verify transactional SQL assertions with explicit rollback. Then prove a real authenticated two-player match is stored exactly once, applies exactly one rating result, and agrees with profile/rankings views. Replay its stored result without duplicate rating/rewards. Do not claim prior unsaved matches can be recovered.

## Review receipt

- Graphify consulted: competitive rankings specification, duel room persistence/types, Supabase service, ranking/reward dependencies; cited SQL sources verified directly.
- Files changed by this investigator: this document, `supabase/migrations/20261028000001_recover_duel_rankings.sql`, and the reviewed legacy-function regressions in `supabase/tests/rankings.sql`. Ignored local cluster/fixture files are verification artifacts only. No application source or hosted schema changed.
- Commands/results: Graphify query/source reads; tool/environment-presence checks with no secret values; read-only Management API SQL probe HTTP 401; local initdb/start; expected failing structural test; successful exact recovery/structural/14 behavioral assertions; successful replay preservation and RLS queries.
- Ponytail: reused existing schema/formulas/security, minimal wallet prerequisite, no dependency or generic framework introduced.
- Open risks: hosted physical schema/history/access unverified; exact hosted script approval pending; column types/constraints and live reward prerequisites require trusted preflight; authenticated browser and PostgreSQL 17 hosted evidence pending. Full app suites/builds are parent-owned.
