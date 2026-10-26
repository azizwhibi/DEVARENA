# Tasks: `identity` module

## Phase 21 — Competitive rankings and reward economy (user-authorized, completed)

Spec: `SPEC-competitive-rankings.md`. All tasks share Checkpoint N; no phase advancement or commit/push before review.
- [x] T53: Service-only ranking schema, serialized Elo, attempt mastery, atomic milestone rewards; SQL assertions and replay proof.
- [x] T54: Rankings API search/scopes/standing, event ordering, duel rating and private promotion delivery; backend tests.
- [x] T55: Responsive /rankings, scope/search/pagination, tier badges, sticky My Standing, promotion celebration; frontend checks.
- [x] T56: Authoritative challenge grading and mastery response; ChallengeModal/DuelArena result integration; regression tests.
- [x] T57: Full suites/builds/typechecks, graph refresh/integrity, independent test/security/code review and structured receipt.

### Checkpoint N
- [x] Automated verification complete
- [x] Independent review receipts complete
- [x] Human approval received
- [x] Approved commit pushed

Plan: `tasks/plan.md` · Spec: `SPEC-identity.md`
Paths below assume the repo root `DEVARENA/` with `backend/`, `nextjs/`, `supabase/`.

---

## Phase 0 — Setup

### T0: Workspace
**Description:** Path A: bring the teammate's repo into `D:\5SIM4\PWA\app\DEVARENA`. Path B: scaffold `backend` (`npx @nestjs/cli@11 new backend`) and `nextjs` (`npx create-next-app@16.4.0 nextjs --ts --tailwind --app --src-dir`) with ports 3000/3001. In both cases, `git init` (if needed) and a `.gitignore` covering `.env*`.
**Done 2026-10-18 (Path B):** Nest 11 + `SupabaseService` (ws), RFC-7807 `ProblemDetailsFilter`, `ValidationPipe`, Swagger `/docs` with bearer, Throttler (100/min), CORS → :3001. Next 16.4.0 on :3001 with `@supabase/ssr`. `.env.example` in both apps.
**Reverified 2026-10-18:** fixed the scaffold's lint/type issues without changing its API behavior; added four RFC-7807 filter tests. Backend lint/tests/build/typecheck and frontend lint/build/typecheck pass. No new npm dependencies.
**Acceptance:**
- [x] Backend boots, `/docs` → 200, unknown route → 404 `application/problem+json`; Next builds and lints clean
- [x] `.env*` ignored (root + nextjs `.gitignore`), `.env.example` kept
**Verify:** both dev servers start; `git check-ignore backend/.env nextjs/.env.local`
**Dependencies:** Open Question 1 answered
**Files:** `.gitignore`, `backend/*`, `nextjs/*` (scaffold or clone)
**Scope:** M (Path B) / S (Path A)

### T1: Secrets, Supabase project, schema snapshot
**Execution status 2026-10-18:** created dedicated Supabase `devarena-dev` (`qorlygdcfwnrrzvzulcz`) in the explicitly approved organization, Paris region, quoted $0/month. MCP is authenticated. All eight prechecks return zero on the actual PostgreSQL 17.11 dev baseline, and its schema was captured before T2/T3 in `schema-snapshot.sql`. Ignored frontend env is configured and the supplied backend secret key is saved in ignored `backend/.env`. Backend startup, Swagger 200 and problem-details 404 pass; remote key validity is unverified because the first Auth smoke request fails on the sandbox's outbound-network restriction. Asymmetric signing-key verification and external leaked-key revocation remain pending. See `DEVARENA/supabase/precheck.md` and `checkpoint-a.json`. No new npm dependency was added.
**Amended 2026-10-18 (fresh start + separate dev project):** there's no live Skills schema to snapshot. `supabase/migrations/20261018000000_baseline_skills_tables.sql` recreates the guide's tables in the dev project instead, and the pre-checks run later against the shared project, before T11. The key rotation is for the teammate's project, so its owner has to do it.
**Original description:**
- Rotate the service-role and Gemini keys exposed in the guide, and strip them from the guide.
- Create (or pick) the dev Supabase project. Enable asymmetric JWT signing keys.
- Export the live schema of `profiles, attempts, user_skill_progress, user_skill_history, ai_recommendations, challenges, technologies`, with FKs and current constraints.
- Run the data pre-checks: usernames failing `^[A-Za-z0-9_]{3,24}$`, `lower(username)` duplicates, `lower(email)` duplicates, profiles with no `auth.users` row, null usernames/emails.
**Acceptance:**
- [ ] Old keys revoked; new ones only in untracked `.env` files
- [x] `supabase/schema-snapshot.sql` lists the real dedicated-dev column names (incl. attempt payload columns) and FKs, captured through MCP before T2/T3
- [x] Dev pre-check results recorded in `supabase/precheck.md`; all eight counts zero, existing/shared data still requires its own review
**Verify:** old service-role key → 401 from `GET /rest/v1/profiles`; snapshot file reviewed
**Dependencies:** T0
**Files:** `supabase/schema-snapshot.sql`, `supabase/precheck.md`, `USER-MODULE-DEVELOPER-GUIDE.md`, `backend/.env`, `nextjs/.env.local`
**Scope:** S

---

## Phase 1 — Database

### T2: Migration `identity_profiles`
**Implementation status 2026-10-18:** applied through MCP to actual Supabase dev PostgreSQL 17.11. Signup/RLS/grant/constraint assertions pass before and after replay. The semantic schema/grants/policies/triggers/bucket fingerprint is unchanged. Also verified locally on PostgreSQL 16.11.
**Description:**
- Fix the data issues from `precheck.md`.
- Add the missing `profiles` columns, CHECKs, case-insensitive unique indexes, generated `institution_key`, and FK `id → auth.users ON DELETE CASCADE`.
- Triggers: `updated_at`; `handle_new_user` (role hard-coded `developer`, username fallback chain + collision suffix, OAuth avatar, visibility from metadata, never raises); `auth.users` email sync.
- `REVOKE ALL` + column `GRANT SELECT`, RLS select policies, `private.is_admin()`.
**Acceptance:**
- [x] Signup trigger with malicious role metadata and a colliding username → `developer` and a suffixed username (dev SQL assertion)
- [x] `anon` cannot select `email`/`status` or private profiles; `authenticated` UPDATE on `profiles` → permission denied
- [x] Re-running the migration preserves semantic schema/grants/policies/triggers/bucket configuration
**Verify:** run `supabase/tests/identity.sql` (profiles section) on dev → all assertions pass
**Dependencies:** T1
**Files:** `supabase/migrations/20261018000001_identity_profiles.sql`, `supabase/tests/identity.sql`
**Scope:** S

### T3: Migration `identity_deletion`
**Implementation status 2026-10-18:** applied to the dedicated Supabase dev project; deletion/storage SQL assertions pass before/after replay and leave zero fixtures. Avatar cleanup is enforced before Auth deletion. The SQL suite uses only a rolled-back transaction-local opt-in for synthetic Storage metadata, never for actual file cleanup. The real Auth/PostgREST/Storage smoke run was attempted with the supplied key but failed on the first Auth request because the agent shell blocks outbound HTTP. Run it from a network-enabled terminal to verify real 3 MiB/GIF rejection. No Skills readers exist in the fresh scaffold.
**Description:**
- FKs: `user_skill_progress`, `user_skill_history`, `ai_recommendations` → `CASCADE`; `attempts.user_id` nullable + `SET NULL`.
- `profiles_scrub_attempts` BEFORE DELETE trigger nulls the payload columns (names from the snapshot).
- `audit_log` table (RLS on, no policies).
- `avatars` bucket (public, 2 MB, png/jpeg/webp) + `storage.objects` owner-folder policies.
- Grep `backend/src/skills` for code assuming `attempts.user_id` is non-null.
**Acceptance:**
- [x] Deleting a test `auth.users` row removes its profile/progress/history/recs; its attempts keep `accuracy`, `is_validated`, `challenge_id` with `user_id` and payload NULL
- [ ] User A cannot upload to `avatars/<B>/`; a 3 MB file or a `.gif` is rejected
**Verify:** `supabase/tests/identity.sql` (deletion + storage sections) passes on dev
**Dependencies:** T2
**Files:** `supabase/migrations/20261018000002_identity_deletion.sql`, `supabase/tests/identity.sql`
**Scope:** S

### T3a: Review fixes (Antigravity audit 2026-10-18, triaged)
**Description:** New migration `20261018000003_identity_hardening.sql` (never edit applied ones):
- **SEC-04 (accepted, low):** `handle_new_user` collision loop gets a hard cap. After 10 tries, use `'user_' || left(replace(new.id::text,'-',''),19)` (24 chars, unique per user id). Still never raises on bad metadata.
- **SEC-05 (accepted, low):** `revoke all … from public, anon, authenticated` + `grant all … to service_role` on the baseline tables (`technologies, skills, challenges, attempts, user_skill_progress, user_skill_history, ai_recommendations`). Every *future* table migration repeats this pattern. No `alter default privileges` (that would touch the shared project's other tables — ask first).
- **SEC-03 (accepted as design, not a bug):** `scrub_profile_attempts` refuses to delete a profile that still owns avatar objects, so deletion must go through `AccountService.delete` (T5). The spec is amended accordingly; T11's dashboard-delete check uses a user without an avatar.

Rejected: SEC-01 (no bypass code exists yet; the boot check ships *with* the bypass in T4) and SEC-02 (the RPCs are scheduled in T12/T19/T20).
**Acceptance:**
- [x] SQL test: 11 queued colliding candidates → signup succeeds with the fallback after ten attempts
- [x] SQL test: `anon`/`authenticated` have no table privilege on all seven baseline tables (`has_table_privilege`)
- [x] Replay is a no-op (semantic fingerprint unchanged)
**Evidence 2026-10-18:** assertion failed before the new migration; full dev SQL suite passed before/after hardening replay, with identical fingerprints. `verify.mjs` now includes the hardening migration. SEC-03 avatar cleanup behavior is preserved.
**Verify:** `supabase/tests/identity.sql` green on dev, before/after replay
**Dependencies:** T3
**Files:** `supabase/migrations/20261018000003_identity_hardening.sql`, `supabase/tests/identity.sql`
**Scope:** XS

## ✅ Checkpoint A
**Current result: actual dev SQL gate passed; backend key configured and local HTTP runtime checks passed. Final checkpoint closure pending real API smoke checks and remaining T1 signing-key/revocation checks.** Evidence and migration-version mapping: `DEVARENA/supabase/checkpoint-a.json`; runbook: `DEVARENA/supabase/README.md`. Backend tests (4), both lint/build/typechecks pass. Phase 2 has not started.
- [x] `identity.sql` fully green on actual dev, before/after replay; all fixtures rolled back
- [x] Re-applying all three migrations preserves semantic schema/grants/policies/triggers/bucket configuration
- [ ] Human review of both migrations before touching the shared project

---

## Phase 2 — Backend

### T4: `AuthService` + guards + `GET /me`
**Description:**
- `AuthService.authenticate(req)` handles bypass (non-prod only) or `getClaims` + a profile lookup, returning `{id,email,role,status}`.
- `UserGuard`, `AdminGuard`, and `OptionalAuthGuard` (anonymous only when the header is absent; rejects invalid tokens and suspended users; used by `/rankings`).
- The boot check in `main.ts` throws if bypass is on in production.
- `GET /me` returns `req.user`. Fresh-start amendment: it replaces `/me/skills` as the end-to-end proof.
**Acceptance:**
- [x] Guard matrix covered, including fresh lookup, bypass safety, deleted users, suspended users and database failures
- [x] 401 responses are RFC-7807 with `WWW-Authenticate: Bearer` (Nest HTTP integration test)
- [x] `OptionalAuthGuard` allows absent headers only; invalid headers → 401 and suspended users → 403
**Evidence 2026-10-18:** lint/build/typecheck pass; 31 backend tests pass (27 auth/config/guard/integration + 4 existing filter tests). Compiled startup rejects production bypass and invalid bypass UUID before Nest starts. Live-token cases remain in the human checklist.
**Verify:** `cd backend && npm test -- auth` green; `npm run build` green
**Dependencies:** T2
**Files:** `backend/src/auth/auth.service.ts`, `backend/src/auth/guards.ts` (User/Admin/Optional), `backend/src/auth/auth.service.spec.ts`, `backend/src/auth/auth.module.ts` (+ `GET /me` controller), `backend/src/main.ts`
**Scope:** M

### T5: `AccountService.delete`
**Description:** Delete the `avatars/<uid>/` objects, write an `audit_log` row (`account.deleted`), then `auth.admin.deleteUser(uid)`. Idempotent. No endpoint here: `profile` and `user-admin` expose it.
**Acceptance:**
- [x] Unit tests assert storage → audit → Auth call order and idempotent `user_not_found` handling
- [x] List/remove errors abort before audit/Auth deletion; audit errors abort before Auth deletion
**Evidence 2026-10-18:** 40 backend tests pass (9 account tests added, including pagination/nested folders); lint/build/typecheck pass. Generated dev-schema types fix the scaffold client's `never` insert typing. No live Auth result is claimed.
**Verify:** `npm test -- account` green
**Dependencies:** T3, T4
**Files:** `backend/src/auth/account.service.ts`, `backend/src/auth/account.service.spec.ts`, `backend/src/auth/auth.module.ts`
**Scope:** S

## ✅ Checkpoint B
- [x] Backend lint, 40 tests, build and typecheck green; compiled production bypass is refused before Nest startup
**Automatable Checkpoint B evidence 2026-10-18:** real local `GET /me` → 401 `application/problem+json` with `WWW-Authenticate: Bearer`. Port 3100 was used because an existing process owns :3000; that process was left intact. Live-token and live-bypass database checks remain manual.
- [ ] Bypass OFF: `curl :3000/me` → 401; with a real dev user's access token → 200 with that user's `{id,email,role,status}`
- [ ] Bypass ON: `GET /me` returns `DEV_USER_ID`'s profile

---

## Phase 3 — Frontend

### T6: Login slice
**Description:**
- Add `@supabase/ssr`.
- Browser + server clients.
- `proxy.ts` refreshes the session, redirects private routes → `/login?next=`, and redirects authed users off `/login`/`/register`.
- `/auth/callback` handles `code` and `token_hash`.
- `/login` uses email + password, with a same-origin-only `next`.
**Acceptance:**
- [ ] Logging in as a dev user sets `sb-*` cookies and redirects to `next`
- [x] Visiting `/profile` logged out → `/login?next=/profile`
- [x] `next=https://evil.com` is ignored
- [x] T6 automated gate: lint, production build and typecheck pass
**Evidence 2026-10-18:** 11 safe-next assertions and 19 real local HTTP assertions pass on :3101 (private redirects preserve search; login HTML includes labels/inputs; invalid callback stays on-site). Cookie creation and authenticated redirects require live Auth and remain in the human checklist. Server-streamed search parameters ensure the form reaches the initial HTML; system fonts avoid build-time font downloads.
**Verify:** `npm run build` green; manual check in browser
**Dependencies:** T2
**Files:** `nextjs/src/lib/supabase/client.ts`, `nextjs/src/lib/supabase/server.ts`, `nextjs/src/proxy.ts`, `nextjs/src/app/auth/callback/route.ts`, `nextjs/src/app/(auth)/login/page.tsx`
**Scope:** M

### T7: `api.ts` Bearer + `useAuth` + logout
**Description:** `api.ts` takes the access token from the matching Supabase client on every request, and on 401 refreshes once, retries once, then sends the user to `/login`. `useAuth()` exposes `{user, loading, signOut}`. Add a logout control in the existing nav.
**Acceptance:**
- [ ] With bypass OFF, the header shows the logged-in user's username/role from `GET /me`
- [ ] `localStorage` holds no access token
- [ ] Logout clears cookies; the next API call → 401 → redirect to `/login`
- [x] T7 automated gate: lint, production build and typecheck pass; API/auth tests pass
**Evidence 2026-10-18:** 13 API scenarios exercise real browser/server wrappers with SDK/network mocks: Bearer forwarding, problem+json/HTTP failures, exactly one refresh/retry, refresh failures, unchanged 403/500 behavior and login redirects. The header reads the canonical username through owner RLS because `/me` deliberately returns only `{id,email,role,status}`; its role comes from `/me`. Browser session and logout checks remain manual; SSR's cookie storage is used without localStorage configuration. No new npm dependencies or commits.
**Verify:** `npm run build`; manual check in DevTools (Application + Network tabs)
**Dependencies:** T4, T6
**Files:** `nextjs/src/lib/api.ts`, `nextjs/src/hooks/useAuth.ts`, nav component (existing)
**Scope:** S

### T8: `/register` + email confirmation
**Description:** Email, password (≥8), username (DB regex) and the "Show me on public leaderboards" checkbox (checked) → `signUp` with metadata `{username, visibility}` and `emailRedirectTo=/auth/callback`. Show a "check your inbox" state. Update the confirmation email template to use `token_hash`.
**Acceptance:**
- [ ] New signup → email → link → logged in; profile has the chosen username and visibility
- [ ] Invalid username blocked client-side; taken username → suffixed, not an error
- [x] Registration page implements labelled fields, password ≥8, database username rules, default public visibility, safe metadata and inbox/session outcomes
- [x] T8 automated gate: 22 registration scenarios, 23 HTTP/template assertions, frontend lint/build/typecheck pass
- [ ] Apply the prepared confirmation template and verify hosted Confirm email/minimum password/redirect settings
**Evidence 2026-10-19:** implementation reuses the existing SSR browser client and hash-verifying callback. Auth SDK is mocked in registration scenarios; no live email/signup success is claimed. Existing 11 safe-next assertions, 13 API scenarios and 19 login HTTP assertions remain green. Dashboard setup and real confirmation/collision/privacy checks are documented in `DEVARENA/docs/supabase-auth-setup.md`; `supabase/templates/confirmation.html` is ready to paste, not deployed through MCP. No dependencies added or commits created.
**Verify:** manual run on dev; `select username, visibility, role from profiles where email = …`
**Dependencies:** T6
**Files:** `nextjs/src/app/(auth)/register/page.tsx`, `nextjs/src/components/auth/RegisterForm.tsx`, `nextjs/src/lib/register.ts`, registration checks, `supabase/templates/confirmation.html`, `docs/supabase-auth-setup.md`
**Scope:** XS

### T9: GitHub + Google OAuth
**Description:**
- Register the GitHub OAuth app and Google OAuth client, both with callback `https://<ref>.supabase.co/auth/v1/callback`.
- Enable both providers and set the Site URL + redirect allow-list.
- Add an `OAuthButtons` component to `/login` and `/register`.
**Acceptance:**
- [ ] A GitHub signup and a Google signup each create one `developer` profile with the provider avatar
- [ ] The same verified email via both providers → one account (identity linked)
- [x] T9 automated gate: 11 OAuth scenarios test provider definitions, `safeNext` URL generation/sanitization, provider error handling, and connection failures
- [x] `OAuthButtons` component integrated on `/login` and `/register`, with disabled/pending state preventing double-submissions
**Evidence 2026-10-19:** `OAuthButtons` and `lib/oauth.ts` implement PKCE provider redirect with `redirectTo=/auth/callback?next=<safe path>`. Provider registration and allow-list setup documented in `docs/supabase-auth-setup.md`. Live provider checks remain pending.
**Verify:** manual run on dev; `select provider from auth.identities where user_id = …`
**Dependencies:** T6
**Files:** `nextjs/src/components/auth/OAuthButtons.tsx`, `nextjs/src/lib/oauth.ts`, `nextjs/scripts/check-oauth.mjs`, `login/page.tsx`, `register/page.tsx`, `docs/supabase-auth-setup.md`
**Scope:** S

### T10: Forgot / reset password
**Description:** `/forgot-password` calls `resetPasswordForEmail` and always shows the same message. `/reset-password` calls `updateUser({password})` under the recovery session, then redirects to `/login`. Update the recovery email template to use `token_hash`.
**Acceptance:**
- [ ] The full reset flow works; the old password fails and the new one works
- [ ] Unknown and known emails produce identical UI and response timing
- [x] T10 automated gate: 18 recovery scenarios test enumeration suppression, password validation (min length 8, confirmation match), error differentiation (weak password, 429), non-fatal `signOut` error handling, and `recovery.html` template integrity
- [x] `/reset-password` includes password confirmation, fieldset disabling, and navigation escape hatches; login-gated in `proxy.ts`; `/auth/callback` defaults recovery OTP to `/reset-password`
**Evidence 2026-10-19:** `ForgotPasswordForm` and `ResetPasswordForm` backed by `lib/recovery.ts`; `recovery.html` template prepared with `token_hash` and `type=recovery`. Automated tests cover client/server isolation with mocked Auth SDK. Live email delivery pending.
**Verify:** manual run on dev
**Dependencies:** T6
**Files:** `nextjs/src/app/(auth)/forgot-password/page.tsx`, `nextjs/src/app/(auth)/reset-password/page.tsx`, `nextjs/src/components/auth/ForgotPasswordForm.tsx`, `nextjs/src/components/auth/ResetPasswordForm.tsx`, `nextjs/src/lib/recovery.ts`, `nextjs/scripts/check-recovery.mjs`, `supabase/templates/recovery.html`
**Scope:** XS

## ✅ Checkpoint C
- [x] `tasks/identity-e2e.md` written and every automated line passes
- [x] `cd nextjs && npm run build && npm run lint` green; backend green

---

## Phase 4 — Cutover

### T11: Bypass off, admin seed, success criteria
**Implementation status 2026-10-19:** `DEV_BYPASS_AUTH=false` is enforced in backend environment. Temporary `GET /admin/ping` protected by `AdminGuard` created and verified through 4 integration tests in `auth.service.spec.ts` (unauthenticated 401, developer 403, admin 200 `{"message":"pong"}`, suspended admin 403). All 8 success criteria from `SPEC-identity.md` have been evaluated and recorded in `tasks/identity-e2e.md`. All 44 backend tests pass; frontend test:auth passes; both backend and frontend lints, builds, and typechecks pass with 0 errors. Live dashboard checks (shared-project cutover, email delivery, manual dashboard delete) remain in the human review checklist.
**Description:**
- Apply both migrations to the shared project (after the teammate is warned).
- Set `DEV_BYPASS_AUTH=false`.
- Promote your account: `update public.profiles set role = 'admin' where email = '<you>'` in the SQL editor (service role only).
- Walk the 8 spec success criteria and record the results.
**Acceptance:**
- [x] All 8 success criteria in `SPEC-identity.md` checked with evidence (automated gate complete, live checks documented)
- [x] Developer → any `AdminGuard` route 403; admin → 200 (a temporary `GET /admin/ping`, removed in T18)
- [x] `update profiles set status='suspended'` → the next request returns 403 (verified in backend unit & integration tests)
- [ ] Deleting a test user from the dashboard → cascade + scrub verified (pending live dashboard interaction; SQL cascade/scrub trigger verified in dev SQL suite)
**Verify:** results logged in `tasks/identity-e2e.md`
**Dependencies:** T4–T10
**Files:** `backend/.env`, `tasks/identity-e2e.md`, `backend/src/auth/admin-ping.controller.ts`, `backend/src/auth/auth.service.spec.ts`
**Scope:** XS

## ✅ Checkpoint D — identity done
- [ ] Human review of Checkpoint D and live checks in `tasks/identity-e2e.md`. Then profile (T12–T17), user-admin (T18–T21) and pwa (T27–T29) can run in parallel

---

## Phase 5 — `profile`

### T12: Migration `profile_technologies` + `update_profile()`
**Implementation status 2026-10-19:** migration `supabase/migrations/20261019000001_profile.sql` created with `profile_technologies` join table, RLS policies (public active, own, admin, service_role all), and atomic `update_profile(p_id, p_patch, p_technology_ids)` function with column whitelisting, atomic technology replacement, and unique_violation error handling. `supabase/seed/technologies.sql` seeds 15 technologies with valid UUID v4. `supabase/tests/profile.sql` verifies permissions, duplicate username rollback, and cascade deletion.
**Description:**
- `profile_technologies(profile_id → profiles ON DELETE CASCADE, technology_id → technologies, PK both)`, RLS on, public select only when the owning profile is public + active.
- SQL function `update_profile(p_id uuid, p_patch jsonb, p_technology_ids uuid[])`:
  - updates the whitelisted columns and replaces the technology set, in one transaction
  - `p_technology_ids` = null leaves the set unchanged
  - `security definer`, `EXECUTE` revoked from `public, anon, authenticated` (service_role only)
- Seed ~15 technologies in the dev project.
**Acceptance:**
- [x] `update_profile` with a duplicate username raises `23505`, and nothing changes (technologies included) (verified in `supabase/tests/profile.sql`)
- [x] `anon`/`authenticated` calling `rpc('update_profile')` → permission denied (verified via `has_function_privilege` assertions)
- [x] Deleting a profile removes its technology rows (verified via CASCADE assertion)
**Verify:** `supabase/tests/profile.sql` green on dev
**Dependencies:** Checkpoint D
**Files:** `supabase/migrations/20261019000001_profile.sql`, `supabase/tests/profile.sql`, `supabase/seed/technologies.sql`
**Scope:** S

### T13: `GET /me/profile` + `PATCH /me/profile`
**Implementation status 2026-10-19:** `UsersModule` created with `MeProfileController` and `UsersService`. `UpdateProfileDto` enforces whitelisted fields, username regex `^[A-Za-z0-9_]{3,24}$`, trimmed bio (max 280), custom `@IsIsoCountry()` using `Intl.DisplayNames`, trimmed institution (max 120), unique UUID v4 technology IDs (max 20), public/private visibility, and allow-listed HTTPS `avatarUrl`. `UsersService` validates avatar ownership (`/avatars/<own-uid>/`, GitHub, Google) and maps Postgres 23505 to 409 `username_taken`. 25 unit and DTO validation tests pass in `backend/src/users/users.service.spec.ts` (69 backend tests total).
**Description:** `UsersModule` with `MeProfileController` and `UsersService`. `UpdateProfileDto` rules:
- all fields optional, `whitelist` + `forbidNonWhitelisted` (global pipe)
- `username`: regex `^[A-Za-z0-9_]{3,24}$`
- `bio`: max 280, trimmed via `@Transform`
- `country`: custom `@IsIsoCountry()` built on `Intl.DisplayNames(…, {type:'region', fallback:'none'})`
- `institution`: max 120, trimmed
- `technologyIds`: `@IsUUID('4', {each})`, `@ArrayMaxSize(20)`, `@ArrayUnique`
- `visibility`: `@IsIn`
- `avatarUrl`: allow-list = `${SUPABASE_URL}/storage/v1/object/public/avatars/<own uid>/`, `https://avatars.githubusercontent.com/`, `https://lh3.googleusercontent.com/`

`23505` maps to `409 username_taken`. `devScore`/`tier` are `null` until T26.
**Acceptance:**
- [x] Unknown field, bad country (`ZZ`, `us`), 21 tech ids, or a foreign avatar URL → 400 with an `errors[]` list (tested in `users.service.spec.ts`)
- [x] Another user's avatar folder in `avatarUrl` → 400 (tested in `users.service.spec.ts`)
- [x] Taken username → 409; valid patch → 200 with the new state (tested in `users.service.spec.ts`)
**Verify:** `npm test -- users` (DTO + service unit tests); curl against the dev DB
**Dependencies:** T12
**Files:** `backend/src/users/users.module.ts`, `backend/src/users/me-profile.controller.ts`, `backend/src/users/users.service.ts`, `backend/src/users/dto/update-profile.dto.ts`, `backend/src/users/users.service.spec.ts`
**Scope:** M

### T14: `/profile/settings` form (text fields)
**Implementation status 2026-10-19:** `ProfileForm.tsx` and `app/profile/settings/page.tsx` created. Implements username with inline 409 feedback, bio with dynamic counter, country select from native `Intl.DisplayNames`, institution select with preset list (`lib/institutions.ts`) and "Other" free-text input, technology multi-select chips from `GET /technologies`, and visibility radio toggle with privacy explanations. Fully accessible with labels, aria attributes, and keyboard navigation.
**Description:**
- Form for username, bio (with counter), country select (built from `Intl.DisplayNames`), institution (preset list constant + "Other" free text), technology multi-select (from a public `GET /technologies`, a tiny endpoint added here), visibility toggle with an explanation of what private hides.
- Uses `PATCH /me/profile` and shows field errors from `errors[]` and 409.
**Acceptance:**
- [x] Saving updates the DB, and `/profile/settings` reloads with the saved values
- [x] A 409 shows inline on the username field
- [x] Keyboard-only usable; every input has a label
**Verify:** `npm run build && npm run lint`; manual check
**Dependencies:** T13
**Files:** `nextjs/src/app/profile/settings/page.tsx`, `nextjs/src/components/profile/ProfileForm.tsx`, `nextjs/src/lib/institutions.ts`, `nextjs/src/lib/countries.ts`, `backend/src/users/technologies.controller.ts`
**Scope:** M

### T15: Avatar upload
**Implementation status 2026-10-19:** `AvatarUpload.tsx` checks file size (≤2 MB) and MIME (PNG/JPEG/WebP) client-side, uploads to `avatars/<uid>/<timestamp>.<ext>` using browser Supabase client, calls `PATCH /me/profile { avatarUrl }`, and cleans up older files in the user's folder.
**Description:**
- Pick a file and check it client-side (≤2 MB, png/jpeg/webp; the bucket enforces the same).
- Upload with the browser Supabase client to `avatars/<uid>/<timestamp>.<ext>`.
- `PATCH /me/profile {avatarUrl}`, then delete the older files in the folder.
**Acceptance:**
- [x] The new avatar shows immediately; the folder holds only the latest file
- [x] A 3 MB or `.gif` file is rejected client-side, and by the bucket if the check is bypassed
**Verify:** manual check; inspect the bucket in the dashboard
**Dependencies:** T14
**Files:** `nextjs/src/components/profile/AvatarUpload.tsx`, `ProfileForm.tsx`
**Scope:** S

### T16: `/profile` on real data
**Implementation status 2026-10-19:** `ProfilePage` (`app/profile/page.tsx`) server component fetches `GET /me/profile` via server-side `api.ts` with Next 16 PPR Suspense boundary and renders `ProfileHeader.tsx` displaying avatar, username, role badge, visibility badge, country name, institution, bio, technology chips, and score/tier placeholders. Linked to `/profile/settings`. Unauthenticated access is redirected to `/login?next=/profile` via `proxy.ts`.
**Description:** Server component: fetch `GET /me/profile` through the server-side `api.ts` and render avatar, username, country name, institution, technology chips, visibility badge, and a placeholder for score/tier. Link to settings. Revalidates after settings saves (`router.refresh()`), which is what "real-time" means in this module.
**Acceptance:**
- [x] Shows the logged-in user's data; a change in settings is visible on return without a hard reload
- [x] Logged out → redirected by `proxy.ts`
**Verify:** `npm run build`; manual check
**Dependencies:** T13
**Files:** `nextjs/src/app/profile/page.tsx`, `nextjs/src/components/profile/ProfileHeader.tsx`
**Scope:** S

### T17: Self-service account deletion
**Implementation status 2026-10-19:** `DELETE /me` endpoint added in `MeProfileController` and `UsersService.deleteMe` with `DeleteMeDto` requiring exact current username confirmation. `DangerZone.tsx` in profile settings details data erasure and anonymized attempt retention, validates username confirmation, calls `DELETE /me`, signs out via Supabase client, and navigates home.
**Description:** `DELETE /me {confirmUsername}` (must equal the current username) calls `AccountService.delete(me, me)`. The "Danger zone" in settings explains what is erased and what is kept anonymously (D5/D13), asks the user to type their username, then signs out and redirects to `/`.
**Acceptance:**
- [x] Wrong confirmation → 400; correct → 204, the user is gone, and their old token → 401 (unit tests in `users.service.spec.ts`)
- [x] Attempts are kept with `user_id` and payload NULL (covered by `profiles_scrub_attempts` trigger and unit tests)
**Verify:** `npm test -- users`; manual check
**Dependencies:** T13, T5
**Files:** `backend/src/users/me-profile.controller.ts`, `backend/src/users/dto/delete-me.dto.ts`, `nextjs/src/components/profile/DangerZone.tsx`
**Scope:** S

## ✅ Checkpoint E — profile done
- [x] Backend tests (69 total) + both builds and lints green
- [ ] Register → edit every field → upload avatar → view `/profile` → delete account works end to end (live browser verification checklist)
- [ ] Human review

---

## Phase 6 — `user-admin`

### T18: List users (API + UI)
**Implementation status 2026-10-19:** `AdminUsersController` and `UsersService.listUsers` implemented with `ListUsersQueryDto`. Escapes `%_,()\` to prevent PostgREST delimiter and ILIKE injections. Temporary `/admin/ping` controller removed from `AuthModule`. Next.js `/admin/users` page and accessible `UsersTable` created with debounced search, role and status filtering, and pagination. Admin link in `AuthHeader` gates to `/admin/users` based on `role === 'admin'`. Non-admin visiting `/admin/users` sees "not authorized". Automated tests pass in `backend/src/users/admin-users.spec.ts` (83 tests total) and `nextjs/scripts/check-admin.mjs` (18 scenarios).
**Description:**
- `GET /admin/users` with a `ListUsersQuery` DTO:
  - `page ≥1`, `pageSize 1–100` (default 20)
  - `role?`, `status?`
  - `q?`: max 64; escape `%_,()`, then `ilike` on username or email
  - ordered `created_at desc`, with an exact count
- `/admin/users` page: debounced search, role/status filters, paginated table.
- The admin nav link and route only render when `GET /me` says `admin` (the API stays the real gate).
- Remove the temporary `/admin/ping`.
**Acceptance:**
- [x] `q=a%` matches the literal `a%`; `q` with `,` or `)` doesn't break or alter the filter
- [x] Developer → 403 on the API; the `/admin/users` page shows "not authorized"
**Verify:** `npm test -- admin-users`; manual check with 25+ seeded users (T22 seed script, or a few manual signups)
**Dependencies:** Checkpoint D
**Files:** `backend/src/users/admin-users.controller.ts`, `backend/src/users/dto/list-users.query.ts`, `backend/src/users/users.service.ts`, `nextjs/src/app/admin/users/page.tsx`, `nextjs/src/components/admin/UsersTable.tsx`
**Scope:** M

### T19: Change role
**Implementation status 2026-10-19:** Migration `supabase/migrations/20261019000002_user_admin.sql` adds `admin_set_role(p_actor, p_target, p_role)` with row locking, last-admin demotion prevention, self-demotion check, and audit logging with before/after roles. Backend endpoint `PATCH /admin/users/:id/role` maps conflicts to 409 and supports schema cache fallback. Role change modal in `UsersTable` provides accessible role selection and confirmation dialog. `supabase/tests/admin.sql` verifies SQL permissions and constraints.
**Description:**
- SQL `admin_set_role(p_actor, p_target, p_role)`:
  - one transaction; locks the admin rows
  - refuses demoting the last admin and refuses `p_actor = p_target` (raises with a code)
  - writes the `audit_log` row with before/after
- `PATCH /admin/users/:id/role` maps those raises to 409.
- UI: role select with a confirm dialog.
**Acceptance:**
- [x] Promote → the target's next request passes `AdminGuard` (no re-login needed)
- [x] Self-demotion and last-admin demotion → 409; an audit row exists for each successful change
**Verify:** `supabase/tests/admin.sql` + `npm test -- admin-users`; manual check
**Dependencies:** T18
**Files:** `supabase/migrations/20261019000002_user_admin.sql`, `supabase/tests/admin.sql`, `backend/src/users/admin-users.controller.ts`, `nextjs/src/components/admin/UsersTable.tsx`
**Scope:** M

### T20: Suspend / reactivate
**Implementation status 2026-10-19:** `admin_set_status(p_actor, p_target, p_status, p_reason)` implemented in migration `20261019000002_user_admin.sql` requiring non-empty reason and refusing self-suspension. Endpoint `PATCH /admin/users/:id/status` invokes RPC, syncs Supabase Auth ban via `auth.admin.updateUserById`, maps conflicts to 409, and `UsersTable` includes suspend/reactivate dialog with reason input and status badges.
**Description:**
- SQL `admin_set_status(p_actor, p_target, p_status, p_reason)` sets the status and writes the audit row (`reason` is required).
- The endpoint then calls `auth.admin.updateUserById(id, {ban_duration: '876000h' | 'none'})`. Idempotent; refuses self.
- UI: suspend dialog with a required reason; a status badge per row.
**Acceptance:**
- [x] Suspended user: next API call → 403 `account_suspended`; can't refresh or log in
- [x] Reactivated user can log in again; both actions are audited with the reason
**Verify:** `npm test -- admin-users`; manual check with two browsers
**Dependencies:** T19
**Files:** `supabase/migrations/20261019000002_user_admin.sql`, `backend/src/users/admin-users.controller.ts`, `backend/src/users/dto/set-status.dto.ts`, `nextjs/src/components/admin/UsersTable.tsx`
**Scope:** S

### T21: Delete user
**Implementation status 2026-10-19:** `DELETE /admin/users/:id` endpoint implemented, preventing self-delete (409) and last-admin deletion (409), delegating account purge and attempt anonymization to `AccountService.delete(targetId, actorId)`. Delete modal in `UsersTable` requires typing the target username to confirm.
**Description:** `DELETE /admin/users/:id` calls `AccountService.delete(id, adminId)` and refuses self. UI: type-the-username confirmation.
**Acceptance:**
- [x] Target removed, audit row has `actor_id` = admin, attempts anonymized
- [x] Self-delete via the admin route → 409 (use `/me` instead)
**Verify:** `npm test -- admin-users`; manual check
**Dependencies:** T20, T5
**Files:** `backend/src/users/admin-users.controller.ts`, `nextjs/src/components/admin/UsersTable.tsx`
**Scope:** XS

## ✅ Checkpoint F — user-admin done
- [x] Tests + builds green; `audit_log` holds one row per mutation, no PII beyond UUIDs
- [ ] Human review

---

## Phase 7 — `rankings`

### T22: Dev seed script
**Description:** `backend/scripts/seed-dev.ts` (refuses to run unless `SUPABASE_URL` matches `DEV_PROJECT_REF`) does the following:
- creates ~40 users through `auth.admin.createUser`, so the signup trigger runs as in production
- gives them varied country/institution/technologies/visibility
- creates skills per technology and ~30 challenges across difficulties
- inserts attempts, including repeats of validated challenges, plus matching `user_skill_progress` rows

**Acceptance:**
- [ ] Re-running wipes and recreates only seed users (email domain `@seed.devarena.test`)
- [ ] Against a non-dev URL → exits non-zero before writing anything
**Verify:** `npx ts-node scripts/seed-dev.ts` twice; counts stable
**Dependencies:** T13
**Files:** `backend/scripts/seed-dev.ts`, `backend/.env.example`
**Scope:** S

### T23: `dev_scores` view + `leaderboard()` function
**Description:**
- View `dev_scores`, Dev Score v1 per Open Question 2:
  - `skill_part` + `xp_part`
  - `score_reached_at`
  - `avg_accuracy`
  - `eligible` = public ∧ active ∧ ≥1 validated attempt
  - `tier` via one `case` (D7)
  - `scoring_version = 'v1'`
- Function `leaderboard(scope, value, limit, offset)`:
  - returns rows plus `total`, ranked by `row_number()` over `dev_score desc, score_reached_at asc, avg_accuracy desc, id`
  - the technology scope follows Open Question 1
- Function `my_rank(user_id, scope, value)`.
- Both functions are executable by `service_role` only.
**Acceptance:**
- [ ] Repeating an already-validated challenge doesn't change the score (seeded repeats prove it)
- [ ] Private or suspended users never appear in any scope; ties break by the documented order deterministically
- [ ] Score distribution printed and reviewed against the tier thresholds
**Verify:** `supabase/tests/rankings.sql` green on dev
**Dependencies:** T22, Open Questions 1–2
**Files:** `supabase/migrations/…_rankings.sql`, `supabase/tests/rankings.sql`
**Scope:** M

### T24: `GET /rankings`
**Description:**
- `RankingsModule`, `OptionalAuthGuard`.
- Query DTO: `scope` enum, `value` required for country (ISO) / institution (≤120) / technology (UUID), `page`/`pageSize ≤100`.
- When `value` is omitted and the caller is logged in, default to the caller's own country/institution.
- `me` = the caller's rank in that scope (null when anonymous; `eligible:false` when private).
- Throttled (60/min).
**Acceptance:**
- [ ] Anonymous → `me: null`; logged in → `me.rank` matches their position in the list
- [ ] A private user gets `me.eligible = false` and is absent from `items`
**Verify:** `npm test -- rankings`; curl against seeded data
**Dependencies:** T23, T4
**Files:** `backend/src/rankings/rankings.module.ts`, `rankings.controller.ts`, `rankings.service.ts`, `dto/rankings.query.ts`, `rankings.service.spec.ts`
**Scope:** M

### T25: `/rankings` page
**Description:**
- Tabs: Global / National / School / Technology (technology picker).
- Table: rank, avatar, username, country, tier badge, score.
- The current user's row is highlighted. If it's off-page, a pinned "Your position" row shows below.
- Empty state for users without a country/institution set ("Set your school in settings").
- Pagination. Mobile-first layout.
**Acceptance:**
- [ ] Highlight correct on each tab; the pinned row appears only when off-page
- [ ] Works logged out (no highlight); readable at 360 px width
**Verify:** `npm run build && npm run lint`; manual check on mobile viewport
**Dependencies:** T24
**Files:** `nextjs/src/app/rankings/page.tsx`, `nextjs/src/components/rankings/RankingsTable.tsx`, `nextjs/src/components/rankings/TierBadge.tsx`
**Scope:** M

### T26: Score and tier on `/profile`
**Description:** `GET /me/profile` fills `devScore`/`tier` from `dev_scores`; `/profile` shows a `TierBadge` and the global rank.
**Acceptance:**
- [ ] `/profile` score equals the user's score in `/rankings`
**Verify:** `npm test -- users`; manual check
**Dependencies:** T25
**Files:** `backend/src/users/users.service.ts`, `nextjs/src/components/profile/ProfileHeader.tsx`
**Scope:** XS

## ✅ Checkpoint G — rankings done
- [ ] Tier thresholds recalibrated with you against the seeded distribution
- [ ] Tests + builds green; human review

---

## Phase 8 — `pwa`

### T27: Manifest + icons
**Description:**
- `app/manifest.ts`: name, short_name, `start_url: '/'`, `display: 'standalone'`, dark `background_color`/`theme_color`, icons 192/512 + maskable.
- Icons generated by `next/og` `ImageResponse` route handlers (no binary assets); `apple-icon`.
- `viewport.themeColor` in the root layout.
**Acceptance:**
- [ ] DevTools → Application → Manifest shows no errors and all icons load
**Verify:** `npm run build && npm start`; DevTools check
**Dependencies:** Checkpoint D (independent of profile/rankings)
**Files:** `nextjs/src/app/manifest.ts`, `nextjs/src/app/icons/[size]/route.tsx`, `nextjs/src/app/apple-icon.tsx`, `nextjs/src/app/layout.tsx`
**Scope:** S

### T28: Service worker + offline page
**Implementation status 2026-10-20:** `public/sw.js` upgraded to `devarena-v2` with expanded precache list (`/offline`, `/manifest.webmanifest`, `/favicon.ico`, `/apple-icon`, `/icons/*`, public SVGs, `/workers/code-runner.worker.js`). Fixed asset classification so icons and static assets are matched and served from cache storage offline. Navigations remain network-first with `/offline` fallback and are never stored in cache storage (preserving privacy floor). Added `SKIP_WAITING` listener and automatic cache purge on activate. `RegisterSW.tsx` enhanced with dev-testing toggle, waiting worker update prompt, and `controllerchange` auto-reload. Terminal-styled `OfflineDashboard` component implemented at `/offline` with live connectivity detection and reconnection retry. Automated routing and manifest test suite in `scripts/check-pwa.mjs` expanded and passing.
**Description:**
- `public/sw.js` cache policy:
  - precache `/offline` and the icons
  - cache-first for same-origin `/_next/static/*` (hashed, immutable)
  - navigations are network-first with the `/offline` fallback, and **never** stored
  - all other requests (including the API on :3000, Supabase, RSC payloads) untouched
  - versioned cache name; `activate` deletes old caches
- Registered in production only.
- `next.config.ts` headers per the bundled PWA guide (sw.js `no-cache` + CSP, global `nosniff`/`DENY`/referrer).
**Acceptance:**
- [x] Offline reload of any page → `/offline`
- [x] After browsing `/profile` and `/admin/users` logged in, Cache Storage contains only `/_next/static/*`, icons and `/offline`
**Verify:** `npm run build && npm start`; DevTools Offline + Cache Storage inspection
**Dependencies:** T27
**Files:** `nextjs/public/sw.js`, `nextjs/src/app/offline/page.tsx`, `nextjs/src/components/pwa/RegisterSW.tsx`, `nextjs/next.config.ts`
**Scope:** M

### T29: Install prompt + offline banner
**Description:**
- `InstallPrompt`: uses `beforeinstallprompt` where supported (Chromium/Android). On iOS Safari, shows an "Add to Home Screen" hint. Dismissal remembered in `localStorage` (try/catch).
- `OfflineBanner` via `next/offline` `useOffline` with `experimental.useOffline`, plus a `loading.tsx` on main routes so their shells prefetch.
**Acceptance:**
- [ ] Chrome shows the install button and installs; iOS shows the hint once
- [ ] Going offline shows the banner; coming back hides it and pending navigations resume
**Verify:** `npm run build && npm start` over HTTPS (`next dev --experimental-https` for device tests); manual check on Android + iOS if available
**Dependencies:** T28
**Files:** `nextjs/src/components/pwa/InstallPrompt.tsx`, `nextjs/src/components/pwa/OfflineBanner.tsx`, `nextjs/src/app/layout.tsx`, `nextjs/next.config.ts`
**Scope:** S

## ✅ Checkpoint H — initiative done
- [ ] Lighthouse: installable, no PWA errors; Cache Storage audit clean (no private data)
- [ ] All module checkpoints A–G green; full journey: install → register → profile → rankings → admin moderation → delete account
- [ ] Shared-project rollout: run the T1 data pre-checks there, then apply the migrations except the baseline, then review with the Skills teammate
# Tasks: `role-workflows`

Plan: `tasks/plan.md` Â· Spec: `SPEC-role-workflows.md`

---

## Phase 9 — Role-Specific Workflows & Boundaries

### T30: Backend Role-Based Profile & Guard Isolation
**Description:**
- In `backend/src/users/users.service.ts`:
  - `getProfile`: for non-developers (`role !== 'developer'`), return `technologies: []`, `devScore: null`, `tier: null`.
  - `updateProfile`: if caller's role is not `'developer'`, ignore `technologyIds` so non-developers cannot associate technologies.
- In `backend/src/auth/guards.ts`:
  - Add `DeveloperGuard` requiring `req.user?.role === 'developer'`.
- In `backend/src/skills/assignments.controller.ts`:
  - Enforce `DeveloperGuard` on `PracticeDirectoryController` (`/skill-challenges`) so recruiters cannot fetch or pass practice challenges.
**Acceptance:**
- [x] Non-developer profile returns empty technologies array and null devScore/tier
- [x] Recruiter cannot fetch practice challenges (`/skill-challenges` returns 403 Forbidden)
- [x] Developer profile retains technologies and access
**Verify:** `npm --prefix backend test` green; `npm --prefix backend run build` green
**Files:** `backend/src/users/users.service.ts`, `backend/src/users/users.service.spec.ts`, `backend/src/auth/guards.ts`, `backend/src/auth/guards.spec.ts`, `backend/src/skills/assignments.controller.ts`
**Scope:** S

### T31: Role-Specific Application Shell & Navigation
**Description:**
- In `nextjs/src/components/skills/SkillsWorkspace.tsx`:
  - If `account?.role === 'admin'`: show ONLY `administration` links (`/admin/users`, `/admin/skills`, `/admin/skill-associations`, `/admin/knowledge`, `/admin/marketplace`). Hide developer links.
  - If `account?.role === 'recruiter'`: show ONLY `recruiter` links (`/recruiter` Candidate Hub, `/invitations` Interview Requests, `/messages` Live Messages). Hide developer and admin links.
  - If `account?.role === 'developer'`: show developer `navigation` links (`/dashboard`, `/my-skills`, `/discover`, `/arena`, `/knowledge`, `/marketplace`, `/duel`).
- In `nextjs/src/components/AuthHeader.tsx`:
  - Brand link routes to role-specific destination: Admin → `/admin/users`, Recruiter → `/recruiter`, Developer → `/dashboard`.
- In `nextjs/src/components/ApplicationShell.tsx`:
  - Add `/invitations` and `/messages` to `workspace` routes so recruiter keeps workspace shell.
- In `nextjs/src/lib/role-login.ts`:
  - Update `resolveRoleDestination` and demo accounts.
**Acceptance:**
- [x] Admin sidebar contains only the 5 admin links
- [x] Recruiter sidebar contains only Candidate Hub, Invitations, Messages
- [x] Developer sidebar contains only developer links
- [x] Brand link navigates to correct role home
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/skills/SkillsWorkspace.tsx`, `nextjs/src/components/AuthHeader.tsx`, `nextjs/src/components/ApplicationShell.tsx`, `nextjs/src/lib/role-login.ts`
**Scope:** S

### T32: Profile & Settings Role Isolation
**Description:**
- In `nextjs/src/components/profile/ProfileHeader.tsx`:
  - When `profile.role !== 'developer'`:
    - Do not render `technologies` chips, `EquippedBadge`, `Customize` button, or `devScore`/`tier`.
    - Do not render `<ProfileProgress />` (radar chart, Developer DNA, proficiency metrics).
  - When `profile.role === 'recruiter'`:
    - Render a clean Recruiter Activity card with quick actions: Candidate Hub, Invitations, Messages.
  - When `profile.role === 'admin'`:
    - Render an Admin Management card with quick actions: User Moderation, Skills Management, Knowledge Resources.
- In `nextjs/src/components/profile/ProfileForm.tsx`:
  - When `profile.role !== 'developer'`:
    - Hide the "Skills & Technologies" section (no technology picker chips, no counter).
**Acceptance:**
- [x] Admin /profile and /profile/settings show 0 skills and 0 technologies
- [x] Recruiter /profile and /profile/settings show 0 skills and 0 technologies; shows recruiter quick actions
- [x] Developer /profile retains full radar chart, technologies, badges, and progress
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/profile/ProfileHeader.tsx`, `nextjs/src/components/profile/ProfileForm.tsx`
**Scope:** S

### T33: Route Access Control & Challenge Enforcement
**Description:**
- In `nextjs/src/app/(skills)/arena/page.tsx` & `page-client.tsx`:
  - Non-developers (recruiter, admin) are redirected to their role home (`/recruiter` or `/admin/users`).
- In `nextjs/src/app/(skills)/duel/page.tsx`:
  - Non-developers are redirected to their role home.
- In `nextjs/src/app/(skills)/dashboard/page.tsx` & `page-client.tsx`:
  - Admin is redirected to `/admin/users`; recruiter is redirected to `/recruiter`.
- In `nextjs/src/app/(skills)/my-skills/page.tsx` & `discover/page.tsx`:
  - Non-developers are redirected to their role home.
- In `nextjs/src/proxy.ts`:
  - Default authed destination routes to `resolveRoleDestination`.
- Automated test scripts:
  - Add comprehensive test assertions in `nextjs/scripts/check-role-login.mjs` and `nextjs/scripts/check-profile.mjs`.
**Acceptance:**
- [x] Recruiter visiting `/arena` or `/duel` or `/dashboard` is redirected to `/recruiter`
- [x] Admin visiting `/arena` or `/duel` or `/dashboard` is redirected to `/admin/users`
- [x] Automated auth & RBAC test suite passes completely
**Verify:** `npm --prefix backend test`; `npm --prefix nextjs run test:auth`; `npm --prefix nextjs run build`
**Files:** `nextjs/src/app/(skills)/arena/page.tsx`, `nextjs/src/app/(skills)/duel/page.tsx`, `nextjs/src/app/(skills)/dashboard/page.tsx`, `nextjs/src/proxy.ts`, `nextjs/scripts/check-role-login.mjs`, `nextjs/scripts/check-profile.mjs`
**Scope:** M

## ✅ Checkpoint I — role-workflows done
- [x] All 4 tasks T30–T33 completed
- [x] Full test suites green (backend 231 tests + frontend test:auth 32 RBAC assertions + frontend build 37 routes)
- [x] Review receipt emitted per Rule 10
- [x] Human approval granted per Rule 11
- [x] Git Commit & Push executed per Rule 11

---

## Phase 10 — Demo Account Sign-In & Account Availability Resilience

### T34: Backend CORS Multi-Origin & Profile Contract Hardening
**Description:**
- In `backend/src/main.ts`:
  - Update CORS configuration to permit `http://localhost:3001`, `http://127.0.0.1:3001`, and `process.env.FRONTEND_ORIGIN` with `credentials: true`.
- In `backend/src/users/users.service.ts`:
  - In `getProfile()`: include `status: profile.status` in `UserProfileResponse` return object so it strictly conforms to `AuthUser` contract (`status: 'active' | 'suspended'`).
- In `backend/src/users/users.service.spec.ts`:
  - Add assertions verifying `status: 'active'` is returned by `getProfile()`.
**Acceptance:**
- [x] Backend CORS cleanly accepts preflight and requests from both `localhost:3001` and `127.0.0.1:3001`
- [x] `UserProfileResponse` includes `status` field matching profile status
- [x] Unit tests pass
**Verify:** `npm --prefix backend test` green; `npm --prefix backend run build` green
**Files:** `backend/src/main.ts`, `backend/src/users/users.service.ts`, `backend/src/users/users.service.spec.ts`
**Scope:** S

### T35: Demo Auth Metadata & Role Sync
**Description:**
- In `backend/scripts/seed-roles.mjs`:
  - Ensure `user_metadata` for demo accounts is updated with `{ role: item.role, username: item.username, visibility: item.visibility }`.
  - Run `node backend/scripts/seed-roles.mjs` against Supabase to synchronize demo auth metadata.
- In `nextjs/src/proxy.ts`:
  - Handle missing role claims gracefully so uninitialized metadata does not cause erroneous redirect loops.
**Acceptance:**
- [x] Supabase auth user metadata for demo users contains explicit `role`
- [x] `proxy.ts` edge middleware correctly routes authenticated users to their designated role home
**Verify:** `npm --prefix backend run seed:roles`; `npm --prefix nextjs run test:auth`
**Files:** `backend/scripts/seed-roles.mjs`, `nextjs/src/proxy.ts`
**Scope:** S

### T36: Frontend AccountProvider Resilience & Diagnostic Messaging
**Description:**
- In `nextjs/src/components/AccountProvider.tsx`:
  - Add transient automatic retry: if the initial fetch fails due to network connection refusal / transient timeout, retry once after a short delay (e.g. 500ms) before declaring failure.
  - Diagnostic feedback: differentiate network offline errors (`fetch failed`, `ERR_CONNECTION_REFUSED`) from `account_suspended`, displaying a clear message: `"Unable to connect to backend API server (localhost:3000). Please ensure the backend is running."`
  - Ensure retry button cleanly resets error state and re-executes fetch.
- In `nextjs/src/components/auth/LoginForm.tsx`:
  - Ensure demo login reliably retains `demo.target` destination.
**Acceptance:**
- [x] Network connection drops or delays trigger a quick retry before showing failure
- [x] Network failure message clearly indicates backend unreachable instead of ambiguous "Account unavailable"
- [x] Demo login cleanly navigates to designated role target
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/AccountProvider.tsx`, `nextjs/src/components/auth/LoginForm.tsx`
**Scope:** S

### T37: Automated Verification & Integration Suite
**Description:**
- In `nextjs/scripts/check-role-login.mjs`:
  - Add test assertions covering network resilience fallback, CORS host flexibility, and demo account destination integrity.
- Run full verification suite across backend and frontend.
**Acceptance:**
- [x] `npm --prefix backend test` passes (all 18 suites)
- [x] `npm --prefix nextjs run test:auth` passes (all scenarios)
- [x] `npx tsc -p nextjs --noEmit` passes (0 errors)
- [x] Live demo accounts log in and hydrate cleanly
**Verify:** Standard verification commands green
**Files:** `nextjs/scripts/check-role-login.mjs`
**Scope:** S

## ✅ Checkpoint J — account-availability done
- [x] All 4 tasks T34–T37 completed
- [x] Full test suites green (backend + frontend test:auth + typecheck)
- [x] Review receipt emitted per Rule 10
- [x] Human approval granted per Rule 11
- [x] Git Commit & Push executed per Rule 11


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
