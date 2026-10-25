# Identity precheck results — 2026-10-18

Targets actually tested: isolated local PostgreSQL **16.11** (`devarena_identity_test`, loopback port 55432), then the actual dedicated Supabase DEV project **devarena-dev** (`qorlygdcfwnrrzvzulcz`, Paris, PostgreSQL **17.11**). The new cloud project was created in `azizwhibi's Org` with explicit organization/cost approval at the quoted $0/month. No shared/production project was queried or changed.

| Check | Local / cloud-dev violations | Decision before applying to any existing data |
|---|---:|---|
| Invalid username | 0 | Review and sanitize affected usernames with owner approval; preserve IDs. |
| Case-insensitive duplicate username groups | 0 | Agree unique suffixes before adding the unique index. |
| Case-insensitive duplicate email groups | 0 | Reconcile with Auth identities; never merge accounts automatically. |
| Orphan profile | 0 | Reconcile ownership against `auth.users`; never invent a placeholder user. |
| Missing username/email | 0 | Recover from verified Auth data with owner review. |
| Invalid role | 0 | Confirm intended role; never infer admin from metadata. |
| Invalid avatar/bio | 0 | Review unsafe URLs and oversized bios before constraining. |
| Profile/Auth email mismatch | 0 | Auth email is authoritative; agree repairs before applying. |

These zeroes were verified on both **fresh empty baselines**, not on existing/shared users. T2 fails transactionally on these violations; it contains no automatic destructive data repairs. Constraints additionally reject invalid status, visibility, country, institution, and timestamps if such columns already exist.

`schema-snapshot.sql` is now an actual catalog export of the dedicated cloud DEV baseline, captured through MCP before T2/T3 (public columns/defaults/constraints/FKs/RLS flags). `attempts.submitted_code` and `attempts.metadata` are its complete payload columns. There is no `backend/src/skills` in this fresh scaffold and no backend attempt readers to adapt to nullable `user_id`.

## Verification evidence

- Before T2: the new `identity.sql` assertion suite failed because signup created no profile.
- After T2/T3: all SQL assertions passed on PostgreSQL 16.11.
- Cloud DEV: baseline, `identity_profiles`, and `identity_deletion` applied successfully through MCP. The same assertion suite passed on PostgreSQL 17.11 before and after replay.
- Cloud replay: semantic schema/grant/policy/trigger/bucket fingerprint remained `47b08db83d373511107c8287b2c79276`. An initial raw-ACL comparison detected grant ordering; sorting ACL entries preserves every permission in the comparison. The reproducible query is `tests/schema-fingerprint.sql`.
- Cloud fixture cleanup: `auth.users`, `profiles`, `attempts`, `audit_log`, and `storage.objects` all contain zero fixture rows. `storage.allow_delete_query` is unset after the test. Its transaction-local opt-in was necessary for synthetic SQL metadata, as real Supabase has a direct-deletion guard absent from the minimal local fixture.
- Invalid-data rejection: a separate local baseline containing an invalid username was rejected by T2's preflight; no identity columns were committed.
- Migration replay: all three migrations reapplied successfully; full schema, triggers, grants and policies remained unchanged. The repeatable verifier separately compares the avatar bucket configuration.
- Assertions cover malicious and malformed signup metadata, collision suffixes, case-insensitive uniqueness, email sync, generated institution key, timestamps, constraints, private/public/own/admin RLS, immediate suspended-admin revocation, column write/PII read denial, private audit access, own/cross-user avatar operations, restrictive-policy defense, avatar-cleanup prerequisite, personal-data cascades, payload scrubbing and retained anonymous analytics/audit rows.
- All SQL fixtures rolled back. SQL storage fixtures contain no physical files.
- Backend: lint, build, TypeScript and four RFC 7807 filter tests passed after resolving T0 scaffold lint errors.
- Frontend: lint, production build and TypeScript passed. No frontend test script exists in the scaffold.
- No new npm dependencies added. The existing installed Supabase SDK is 2.118.0; the requested 2.109.0 version has not been silently substituted in a database-only task.

## Outstanding before Checkpoint A can be marked complete

MCP is connected and the dedicated cloud SQL gate is green. The existing paused projects were not resumed or changed. Ignored frontend env configuration is complete, and the supplied backend secret key has been saved in ignored `backend/.env`. Backend startup succeeds; `/docs` returns 200 and an unknown route returns RFC 7807 404. The real HTTP smoke run was attempted but failed on its first Auth request due to this shell's network restriction (`EACCES` / `fetch failed`). MCP confirmed zero Auth users and Storage objects afterward; remote key validity is still unverified.

- The backend secret key is now configured. For direct `psql` verification, set the dev database password locally; MCP SQL verification is already complete.
- Run `node supabase/tests/storage-smoke.mjs` from a regular network-enabled terminal against real Auth/PostgREST/Storage services (including 3 MiB/GIF rejection).
- Confirm asymmetric JWT keys in the dev dashboard and external revocation of both exposed keys. The guide has been redacted; rotation is unverified and belongs to the shared-project owner.
- Human review of migrations before any shared-project execution. T4–T7 are now implemented with automated gates green; their live Auth checks remain pending.

## T3a follow-up, 2026-10-18

`identity_hardening` and `identity_hardening_replay` applied only to dedicated DEV. The extended suite passed before and after replay, including ten failed collision attempts followed by the UUID fallback while an eleventh colliding candidate remains queued. Baseline client table grants are revoked. The current replay fingerprint is `0e30f77d06165aa5580d1883919cfc7c`; the T1–T3 value above records the earlier schema. T4/T5 now have 40 passing backend tests; T6/T7 have 11 safe-next assertions, 13 API scenarios and 19 local HTTP assertions. Live checks are tracked in workspace `tasks/identity-e2e.md`.

## Cloud advisor results

Security: no WARN/ERROR findings. Eight informational [RLS-enabled/no-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) reflect intentionally service-only baseline tables and `audit_log`; no client write policies were added to silence them.

Performance: the three specified profile read policies generate one [multiple-permissive-policies warning](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies). Four informational [unindexed-FK notices](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) concern baseline `attempts.challenge_id`, `skills.technology_id`, and the two progress/history `skill_id` relations. The identity deletion paths already have the needed `user_id` indexes. These baseline performance follow-ups do not change the verified access-control behavior.
