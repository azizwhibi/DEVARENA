# Spec: `identity` — Accounts, Sessions & Access Control

Module id: `identity` (see `CAPABILITY-MAP.md`) · Status: **APPROVED 2026-10-18**, amended same day with the open-question answers (see "Resolved questions")

## Objective

Replace `DEV_BYPASS_AUTH` with real Supabase Auth end to end, so every other module can trust `req.user` on the backend and a live session on the frontend.

**Users:** visitor, developer, admin. `recruiter` exists as a role value only, with no MVP behavior.

**User stories**
- As a visitor, I register with email + password + username, confirm my email, and land logged in with a `developer` profile created automatically.
- As a visitor, I sign in with GitHub or Google, and a `developer` profile is created from the provider's username/avatar. A username collision never blocks signup.
- As a user, I log in, log out, request a password reset email, and set a new password from the link.
- As a user, my session survives page reloads and silently refreshes. Protected pages redirect me to `/login` and return me to where I was.
- As an admin, `AdminGuard` grants me admin routes based on `profiles.role` in the database, never on a client-supplied value.
- As a suspended or deleted user, every API call fails, even with a still-unexpired JWT.
- As the system, I can delete an account in one call (`AccountService.delete(userId)`), purging personal data and keeping anonymous attempt statistics. `profile` (self-service) and `user-admin` call it.

**Out of scope here** (belongs to other modules): `/me/profile` endpoints, technologies join table, institution picker, admin user endpoints, suspend/reactivate endpoints, rankings, PWA.

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| DB / Auth | Supabase Cloud (Postgres 15+, GoTrue) | migrations as plain SQL files |
| Backend | NestJS 11, `@supabase/supabase-js` ^2.109.0, `ws` ^8.22 (Node 20) | reuses existing `SupabaseService`, `AllExceptionsFilter` (RFC-7807), global `ValidationPipe` |
| Frontend | Next.js 16.4 App Router, React 19.3, Tailwind v4 | **new dependency: `@supabase/ssr`**, plus `@supabase/supabase-js` if nextjs doesn't have it yet |

## Data Contract

### `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`)

All profile writes go through NestJS (service role). Users get **no** direct UPDATE on `profiles`, so DTO validation (e.g. the avatar host allow-list) can't be bypassed via PostgREST.

| Column | Type / constraint | Set by |
|---|---|---|
| `id` | `uuid` PK, FK `auth.users(id) ON DELETE CASCADE` | trigger |
| `email` | `text not null`, unique on `lower(email)`; synced from `auth.users` by trigger | trigger |
| `username` | `text not null`, unique on `lower(username)`, CHECK `^[A-Za-z0-9_]{3,24}$` | trigger, then `PATCH /me/profile` |
| `role` | `text not null default 'developer'`, CHECK in (`admin`,`developer`,`recruiter`) | admin only |
| `status` | `text not null default 'active'`, CHECK in (`active`,`suspended`) | admin only |
| `avatar_url` | `text`, CHECK `^https://`; the API allows only our `avatars` bucket URL or the GitHub/Google avatar hosts | trigger (OAuth), then `PATCH /me/profile` |
| `bio` | `text`, CHECK `char_length <= 280` | `PATCH /me/profile` |
| `country` | `char(2)`, CHECK `^[A-Z]{2}$` (ISO 3166-1 alpha-2) | `PATCH /me/profile` |
| `institution` | `text`, CHECK `char_length <= 120` | `PATCH /me/profile` |
| `institution_key` | `text GENERATED ALWAYS AS (upper(regexp_replace(trim(institution), '\s+', ' ', 'g'))) STORED` | DB |
| `visibility` | `text not null default 'public'`, CHECK in (`public`,`private`) | trigger (signup choice), then `PATCH /me/profile` |
| `created_at` / `updated_at` | `timestamptz not null default now()`; `updated_at` set by trigger | DB |

`technologies` (join table `profile_technologies`) is defined in `SPEC-profile.md`.

### Other schema changes
- `attempts.user_id`: drop NOT NULL, FK → `ON DELETE SET NULL` (D5).
- `profiles_scrub_attempts` (BEFORE DELETE on `profiles`): nulls the attempt payload columns (submitted code, free-text answers, metadata — exact names from the live schema) for that user, before the FK sets `user_id` to NULL. Kept: `challenge_id`, `accuracy`, `is_validated`, duration, `created_at`. The trigger lives in the DB, so deletes made from the Supabase dashboard are covered too. **Amended 2026-10-18:** it also *refuses* the delete (`23503`) while the user still owns `avatars/<uid>/` objects. SQL can't remove the physical blobs, so failing closed is the only way to guarantee they're erased. Accounts with avatars must therefore be deleted through `AccountService.delete`, which removes the files first.
- Storage bucket `avatars`: public, `file_size_limit` 2 MB, `allowed_mime_types` png/jpeg/webp. `storage.objects` policies let `authenticated` users insert/update/delete only under `avatars/<auth.uid()>/`. This is the one place the browser writes to Supabase directly (amends D4).
- `user_skill_progress`, `user_skill_history`, `ai_recommendations`: FK → `profiles(id) ON DELETE CASCADE` (verify current definitions first).
- New `public.audit_log(id uuid pk, actor_id uuid null, target_id uuid null, action text not null, before jsonb, after jsonb, created_at timestamptz)`. Both actor and target are plain UUIDs **without FK**, so log rows survive deletion. No PII beyond the UUID. RLS enabled with no policies, so only the service role can touch it.

### Triggers
- `on_auth_user_created` (AFTER INSERT on `auth.users`) → `public.handle_new_user()`, `SECURITY DEFINER`, `set search_path = ''`:
  - username candidates, in order: `raw_user_meta_data->>'username'` (email signup) → `user_name` (GitHub) → `preferred_username` → `'user_' || left(id::text, 8)`. The email local-part is never used, because that would publish part of the email. Sanitize to the CHECK charset, then on collision append `_` + 4 random hex chars, retrying until unique.
  - `avatar_url` from metadata `avatar_url` or `picture` (Google), only if it starts with `https://`.
  - `visibility` from metadata if it is `public` or `private`; anything else becomes `public`.
  - `role` is **hard-coded `developer`**. Metadata is user-controlled and is never read for role or status.
  - The function **must not raise** on bad metadata: a raise aborts signup with "Database error saving new user".
- `on_auth_user_email_changed` (AFTER UPDATE OF email on `auth.users`) → sync `profiles.email`.
- `profiles_set_updated_at` (BEFORE UPDATE) → `updated_at = now()`.

### Access control (D3, D4)
- `REVOKE ALL` on `profiles` from `anon, authenticated`. Then:
  - `GRANT SELECT (id, username, avatar_url, bio, country, institution, visibility, role, created_at)` to `anon, authenticated`. `email` and `status` are not selectable through PostgREST.
  - No INSERT/UPDATE/DELETE grants. Rows come from the trigger, change through NestJS, and leave via cascade.
- RLS enabled on `profiles` (read-only for users):
  - `select_public`: `visibility = 'public' and status = 'active'` (anon + authenticated)
  - `select_own`: `id = (select auth.uid())`
  - `select_admin`: `private.is_admin()`, a `SECURITY DEFINER` function, which avoids infinite RLS recursion on `profiles`
- The NestJS service-role client bypasses all of the above by design.

## Backend Contract

### Guards (`backend/src/common/`)
- Shared `AuthService.authenticate(req)` returns `{ id, email, role, status }`, or throws.
  1. If `DEV_BYPASS_AUTH === 'true'`, use `DEV_USER_ID`. **The app refuses to boot if this is set while `NODE_ENV === 'production'`.**
  2. Otherwise, require `Authorization: Bearer <jwt>` and verify it with `supabase.auth.getClaims(token)`. That checks the JWKS locally when the project uses asymmetric signing keys and falls back to a network check on legacy HS256. Read `sub`.
  3. Load `profiles (id, email, role, status)` by PK, **in both modes**, so bypass mode tests real roles.
- `UserGuard`:
  - Missing, invalid or expired token → **401**.
  - Profile not found (deleted user) → **401**.
  - `status = 'suspended'` → **403** `account_suspended`.
  - On success, sets `req.user`.
- `AdminGuard`: same as `UserGuard`, plus `role !== 'admin'` → **403**.
- All errors go through the existing RFC-7807 filter. 401 responses carry `WWW-Authenticate: Bearer`.
- `req.user` keeps its current shape `{ id }` plus the new `email, role` fields, so existing `/me/skills` controllers stay unchanged.
- Swagger: `addBearerAuth()`, with `@ApiBearerAuth()` on guarded controllers.

### `AccountService.delete(userId, actorId)`
1. Delete Storage objects under `avatars/<userId>/` (Storage isn't FK-cascaded).
2. Write `audit_log` (`action = 'account.deleted'`).
3. `supabase.auth.admin.deleteUser(userId)`, a hard delete that cascades through the FKs.

Idempotent: deleting an already-missing user returns success.

## Frontend Contract

### Routes

| Route | Purpose |
|---|---|
| `/login` | email + password, "Continue with GitHub" / "Continue with Google", link to `/register` and `/forgot-password`; honors `?next=` (same-origin paths only) |
| `/register` | email, password (min 8), username (same regex as DB), "Show me on public leaderboards" checkbox (checked by default, sent as metadata `visibility`), GitHub/Google buttons; no role picker (D2) |
| `/forgot-password` | email → `resetPasswordForEmail` with `redirectTo=/auth/callback?next=/reset-password`. Always shows the same message (no account enumeration) |
| `/reset-password` | new password + confirm → `updateUser({ password })`. Requires the recovery session |
| `/auth/callback` | Route Handler: exchanges `code` (OAuth/PKCE) or `token_hash`+`type` (email confirm/recovery) for a session, then redirects to `next` |

### Session
- `lib/supabase/client.ts` (`createBrowserClient`) and `lib/supabase/server.ts` (`createServerClient` + `cookies()`). Uses the publishable key only, never the secret key.
- `proxy.ts` (Next 16's name for middleware):
  - refreshes the session cookie on every request
  - redirects unauthenticated users away from `/profile*`, `/admin*` and other private routes to `/login?next=…`
  - redirects authenticated users away from `/login` and `/register`
  - the redirects are UX only; NestJS is the enforcement point
- `useAuth()` hook: `{ user, loading, signOut }`, backed by `onAuthStateChange`.
- `lib/api.ts`: every request reads the current access token from the matching Supabase client (browser or server) and sends `Authorization: Bearer`. On a 401 it refreshes once and retries once, then sends the user to `/login`. No token in `localStorage` or any other app-managed storage.

### Supabase dashboard configuration (manual, documented in the plan)
- Site URL + redirect allow-list (`http://localhost:3001/auth/callback` plus production URL)
- GitHub OAuth app + Google OAuth client (Google Cloud console), both with callback `https://<project-ref>.supabase.co/auth/v1/callback`
- automatic identity linking by verified email stays ON, so GitHub and Google with the same email give one account
- email confirmation ON
- email templates using `token_hash`
- asymmetric JWT signing keys enabled
- minimum password length 8

### Env
- `nextjs/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `backend/.env`: unchanged keys, after rotation

## Commands

```
Backend dev:     cd backend && npm run start:dev          # :3000, Swagger :3000/docs
Backend test:    cd backend && npm test                    # Jest (Nest default — verify)
Backend build:   cd backend && npm run build
Frontend dev:    cd nextjs && npm run dev -- -p 3001
Frontend build:  cd nextjs && npm run build
Frontend lint:   cd nextjs && npm run lint
Migrations:      paste supabase/migrations/*.sql into the Supabase SQL editor, in filename order
                 (or `supabase db push` if the Supabase CLI is linked — verify)
```

## Project Structure (new/changed only; reconciled with the real tree before planning)

```
supabase/migrations/20261018000001_identity.sql   → profiles ALTERs, triggers, grants, RLS, FK changes, audit_log
supabase/tests/identity.sql                        → assertion script (DO blocks that RAISE on failure)
backend/src/common/auth.service.ts                 → token → { id, email, role, status }
backend/src/common/user.guard.ts                   → rewritten on top of AuthService
backend/src/common/admin.guard.ts                  → rewritten on top of AuthService
backend/src/common/account.service.ts              → delete(userId, actorId)
backend/src/common/*.spec.ts                       → guard + service unit tests
nextjs/src/lib/supabase/{client,server}.ts
nextjs/src/proxy.ts
nextjs/src/lib/api.ts                              → token injection + 401 retry
nextjs/src/hooks/useAuth.ts
nextjs/src/app/(auth)/{login,register,forgot-password,reset-password}/page.tsx
nextjs/src/app/auth/callback/route.ts
```

## Code Style

Match the existing modules (`backend/src/skills`): Nest DI services, `ParseUUIDPipe` on every id param, DTOs with `class-validator`, exceptions thrown as Nest `HttpException`s and shaped by the existing filter. Target shape:

```ts
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = await this.auth.authenticate(req); // throws 401/403
    req.user = user;
    return true;
  }
}
```

SQL: lowercase keywords, `snake_case`, every function `security definer` gets `set search_path = ''` and fully qualified names.

## Testing Strategy

| Level | What | Where |
|---|---|---|
| DB assertions | trigger creates profile with `developer` even when metadata says `admin`; username collision gets a suffix; invalid visibility metadata becomes `public`; `authenticated` cannot update any `profiles` column; anon cannot read `email` or private profiles; user A cannot write to `avatars/<B>/`; deleting the `auth.users` row cascades the profile, nulls `attempts.user_id` **and** the attempt payload columns | `supabase/tests/identity.sql`, run against a **dev** project, never prod |
| Backend unit (Jest) | guard matrix: bypass on/off; bypass + production → boot error; no header / bad token / expired → 401; missing profile → 401; suspended → 403; developer on AdminGuard → 403; admin → pass. `AccountService.delete` order and idempotency | `backend/src/common/*.spec.ts` |
| Manual E2E checklist | register → confirm → login → `/me/skills` returns real user data; GitHub login; forgot/reset; logout; protected redirect + `?next=`; suspended user blocked; deleted user's old token rejected | `tasks/identity-e2e.md` |

Adding Playwright for automated E2E is an *ask-first* item. Not assumed.

## Boundaries

- **Always:**
  - run backend tests + both builds before marking a task done
  - write migrations as new files (never edit an applied one)
  - make migrations idempotent (`if not exists`, `drop … if exists`)
  - test migrations on a dev project before prod
  - validate every input at the API boundary
- **Ask first:**
  - adding any dependency beyond `@supabase/ssr`
  - changing existing `/me/skills` or `/admin/*` contracts
  - touching the scoring engine
  - running anything against the production Supabase project
  - enabling Supabase dashboard settings that affect existing users
- **Never:**
  - commit `.env` files or keys
  - expose the service-role key to Next.js
  - read `role` from client input or auth metadata
  - disable RLS to "make it work"
  - remove or skip a failing test without approval

## Success Criteria

1. With `DEV_BYPASS_AUTH=false`, `GET /me/skills` returns **401** without a token, and the logged-in user's own data with one.
2. A new email signup, a new GitHub signup and a new Google signup each produce exactly one `profiles` row with `role='developer'`, `status='active'`, and a valid unique username, including when the requested username is taken.
3. `supabase/tests/identity.sql` passes, which proves a user cannot escalate `role`/`status` through PostgREST with the anon key, and that `email` and private profiles are hidden from anon.
4. Setting `status='suspended'` makes the next API call return **403** within one request, even with an unexpired token.
5. `AccountService.delete` removes the `auth.users` + `profiles` rows and the avatar files. Prior `attempts` remain with `user_id IS NULL` and their payload columns NULL, while their scores are intact. An `audit_log` row exists.
6. The backend refuses to start with `DEV_BYPASS_AUTH=true` and `NODE_ENV=production`.
7. Login, register, forgot, reset, GitHub + Google OAuth, logout and protected-route redirect all work at `http://localhost:3001`, and no access token appears in `localStorage`.
8. Backend unit tests are green, and `npm run build` succeeds in both apps.

## Resolved questions (2026-10-18)

- Default visibility: `public`, with an opt-out at signup and in settings.
- OAuth: GitHub **and** Google.
- Avatars: `avatars` Storage bucket (2 MB, png/jpeg/webp), with the OAuth avatar as the initial value; no arbitrary URLs.
- Deletion: attempt payload content is nulled, scores kept (`profiles_scrub_attempts`).
- Code location: see `tasks/plan.md` Task 0 — unresolved, the answer conflicts with the guide.

## Superseded open questions (kept for history)

1. **Source code location (blocks planning).** `DEVARENA/backend` and `DEVARENA/nextjs` aren't in this workspace or anywhere on C:/D: (searched depth 4). Copy them under `D:\5SIM4\PWA\app\`, or restart Claude Code from the `DEVARENA` root. I need the real guards, `SupabaseService`, `api.ts`, the current DDL of `profiles`/`attempts`/`challenges`, and the test setup.
2. **Default visibility.** Privacy-by-default (GDPR art. 25) suggests `private`, but then new users never appear on leaderboards. Proposal: the column defaults to `private`, and `/register` shows a "Show me on public leaderboards" checkbox (unchecked). GitHub signups start `private` until they flip it in settings. OK, or default `public`?
3. **Google OAuth.** The guide mentions GitHub *and* Google, your brief only GitHub. Is GitHub alone enough for now?
4. **Avatar storage.** Upload files to a Supabase Storage `avatars` bucket, or accept a URL only (e.g. the GitHub avatar)? This decides whether step 1 of `AccountService.delete` exists. Proposal: Storage bucket, path `avatars/<uid>/…`. Detailed in `SPEC-profile.md`.
5. **Attempt content and GDPR.** If `attempts` stores free-text answers or code, keeping them after deletion (D5) may retain personal data. Should answer content be nulled on deletion too, or is it acceptable as-is?
