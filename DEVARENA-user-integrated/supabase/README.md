# Identity database: T1–T3a

Checkpoint A's **database SQL gate passed on dedicated Supabase DEV**. The supplied backend secret key is saved in the ignored env file; final closure still requires real Auth/Storage API smoke checks and the remaining T1 signing-key/revocation checks.
The shared Skills project has not been contacted or changed.

Dev project: [devarena-dev](https://supabase.com/dashboard/project/qorlygdcfwnrrzvzulcz), ref `qorlygdcfwnrrzvzulcz`, Paris (`eu-west-3`), PostgreSQL 17.11. Created in the approved organization at the quoted $0/month. All three migrations and their replay were verified through MCP; all SQL fixtures rolled back. See `precheck.md` and `checkpoint-a.json`.

## Files and order

1. `migrations/20261018000000_baseline_skills_tables.sql`: fresh DEV project only.
2. `precheck.sql`: read-only counts; resolve every violation before proceeding.
3. `migrations/20261018000001_identity_profiles.sql`: profile constraints, signup/email/timestamp triggers, column grants, RLS.
4. `migrations/20261018000002_identity_deletion.sql`: deletion FKs and payload scrubbing, private audit log, avatar bucket and folder policies.
5. `migrations/20261018000003_identity_hardening.sql`: bounded username collisions and explicit service-only baseline table grants.
6. `tests/identity.sql`: transactional assertions; all fixtures roll back.

T3a also passed on DEV before and after replay. Its schema fingerprint is `0e30f77d06165aa5580d1883919cfc7c`; the earlier T1–T3 fingerprint below is historical. The runner now reapplies hardening after the profile migration, keeping the final signup trigger bounded. Backend auth and the frontend login/session slice (T4–T7) are implemented; see the [workspace live checklist](../../tasks/identity-e2e.md) for pending checks.

`schema-snapshot.sql` was captured by catalog inspection through MCP from the **actual dedicated DEV baseline**, before identity migrations. It records columns, defaults, constraints, FKs and RLS flags; it is an inspection artifact, not a migration or a dump of the shared project. Its attempt payload columns are `submitted_code` and `metadata`. A shared-project rollout must inspect all actual payload columns and FKs first, as required by T11.

## Configure the dedicated dev project

- The shared-project owner must revoke the exposed service-role and AI keys. Redaction in the guide does not revoke them. Verify the old service-role key returns 401 without logging it.
- The dedicated dev project is created. Asymmetric JWT signing keys still need verification in its dashboard.
- Ignored `nextjs/.env.local` has the dev URL and enabled publishable key. `backend/.env` has the supplied secret key and dev URL with bypass off. Local backend startup, Swagger 200, and RFC 7807 404 were verified. The key's remote validity is unverified because the shell cannot reach Supabase. `supabase/.env` has the dev target but no fabricated database password. Keep credentials in the ignored env files.
- `supabase/.env` uses standard libpq variables: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`, plus `DEV_PROJECT_REF` and optional `PG_BIN`. For a Supabase session pooler, use port 5432 and `PGUSER=postgres.<ref>`.
- Install no new npm dependencies. Verification uses the existing PostgreSQL client tools and the backend's existing Supabase SDK. The runners require Node 22+ (`process.loadEnvFile`); the application scaffold still supports Node 20.

The baseline is already applied to this dev project. For a different **empty dev project**, apply it once using the Supabase SQL editor or `psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261018000000_baseline_skills_tables.sql` with dev libpq variables already configured. Do not apply the local test support file to Supabase.

From `DEVARENA/`:

```powershell
node supabase/tests/verify.mjs
node supabase/tests/storage-smoke.mjs
```

The SQL runner verifies the dev host against `DEV_PROJECT_REF`, refuses the known shared project, applies T2/T3/T3a, runs assertions, reapplies T2/T3/T3a, compares schema/grants/policies and avatar bucket configuration, and runs assertions again. It stops on any error. Supply an explicitly dedicated dev ref; the runner cannot discover whether an arbitrary different project is production.

The API smoke test creates two temporary email-confirmed users through the Admin API, signs them in, checks role-metadata rejection and PostgREST column/write permissions, uploads valid PNGs, checks cross-user upload/overwrite/delete denial, and verifies 3 MiB PNG and GIF rejection by **Storage API**. It also proves account deletion is blocked until avatar cleanup succeeds. Cleanup removes files through Storage API before deleting the temporary users. Review any cleanup failure and remove its remaining `@identity.devarena.test` accounts after their files are removed.

Bucket size/MIME assertions in SQL prove configuration only. Real upload enforcement requires the API smoke test. OAuth provider configuration and real GitHub/Google signup remain T9.

This agent's shell cannot make outbound HTTP requests (`EACCES`). The real smoke run was attempted after saving the key but failed on its first Auth request (`AuthRetryableFetchError: fetch failed`); MCP confirmed zero users/files afterward. Run `node supabase/tests/storage-smoke.mjs` from a regular network-enabled terminal. Cloud MCP SQL verification has already passed; missing direct database credentials do not invalidate that result.

For MCP, execute `tests/identity.sql` after removing its final psql-only `\echo` line. The transaction-local `storage.allow_delete_query` opt-in only removes synthetic metadata fixtures that have no physical files; it rolls back and does not change application Storage protections. Compare `tests/schema-fingerprint.sql` before/after migration replay. The fingerprint sorts function ACL entries while retaining every granted privilege.

MCP generates timestamped migration-history versions; their mapping is recorded in `checkpoint-a.json`. Those generated versions differ from the source filenames. Reconcile migration history before switching this existing target to `supabase db push`; do not blindly push source filenames into an independently timestamped history.

## Isolated local PostgreSQL proof

`tests/support/local-supabase.sql` supplies only `auth.users`, `auth.uid()`, storage metadata tables, roles and default grants. It deliberately grants broad defaults so privilege revocations are tested. It does **not** emulate GoTrue, PostgREST, physical files or Storage API enforcement.

In a new disposable database named `devarena_identity_test*`, load the support file and baseline using `psql -X -v ON_ERROR_STOP=1`. Then set the connection variables and run the same verifier:

```powershell
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '55432'
$env:PGDATABASE = 'devarena_identity_test'
$env:PGUSER = 'postgres'
$env:PG_BIN = 'C:\Program Files\PostgreSQL\16\bin'
& "$env:PG_BIN\psql.exe" -X -v ON_ERROR_STOP=1 -f supabase/tests/support/local-supabase.sql
& "$env:PG_BIN\psql.exe" -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261018000000_baseline_skills_tables.sql
node supabase/tests/verify.mjs
```

Create and start your disposable PostgreSQL instance before these commands. Keep its data under ignored `.local/`; bind it to loopback only. Do not point the support script at an existing application's database.

## Deletion contract

The account service in T5 must remove every object in `avatars/<uid>/` through Storage API before calling `auth.admin.deleteUser`. A profile BEFORE DELETE trigger rejects deletion while avatar metadata still exists; it never deletes storage metadata as a substitute for physical file removal. This also prevents direct SQL/dashboard deletion from leaving avatar blobs behind.

Once storage is empty, deletion cascades from Auth to the profile, skill progress, history and AI recommendations. Before profile deletion, `submitted_code` and `metadata` are nulled. Attempts retain their scores, validation, challenge, duration and timestamps, with `user_id` set to NULL. Audit UUID references deliberately have no FK. Service-only atomic RPC audit writers arrive with their corresponding backend/admin tasks; clients have no audit table access.

## Rollback and shared-project cutover

Each migration is a transaction with a lock timeout. Constraint failures abort without partially applying that migration. Invalid existing profile data is rejected with a generic precheck error rather than silently changed.

Take a database backup before a real rollout. The identity schema can remain when rolling back application binaries; do not restore permissive profile grants or remove deletion protections. Use a new forward migration for corrections, and never edit a migration already applied outside disposable tests. Restoring an entire pre-migration backup is the last-resort schema rollback and requires separately reviewed downtime/data-loss handling. Anonymized attempt payloads and physically deleted avatars cannot be reconstructed by a down migration.

Before T11: obtain the shared schema snapshot, inspect all payload columns and precheck counts, agree any data repairs, back up the project, and review both identity migrations with the owner. **Skip the baseline and local support SQL.** Shared/production execution requires its own explicit approval under `SPEC-identity.md`.
