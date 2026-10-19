# Implementation Plan: DevArena User & Auth initiative

Map: `CAPABILITY-MAP.md` (D1–D13) · Spec: `SPEC-identity.md` · Tasks: `tasks/todo.md`
Repo: `D:\5SIM4\PWA\app\DEVARENA` (fresh start, Path B) · Supabase: separate dev project
Status: identity plan **approved**, T0 done · modules profile → pwa **DRAFT, awaiting review** (2026-10-18)
Execution update: **Dedicated `devarena-dev` created with organization/cost approval (`qorlygdcfwnrrzvzulcz`, Paris, quoted $0/month). T2/T3 applied through MCP, dev SQL assertions and semantic replay passed on PostgreSQL 17.11. The supplied backend key is saved in ignored env and local HTTP startup checks pass. Final Checkpoint A closure still requires live API smoke checks from a network-enabled terminal, asymmetric JWT verification and external key-revocation confirmation.** Run instructions and evidence: `DEVARENA/supabase/README.md`, `DEVARENA/supabase/precheck.md`, `DEVARENA/supabase/checkpoint-a.json`.

## Overview

Five modules in dependency order:
- `identity`: accounts, sessions, guards
- `profile`: profile view/edit, avatar, self-deletion
- `user-admin`: list, role, suspend, delete
- `rankings`: Dev Score, leaderboards, tiers
- `pwa`: manifest, service worker, install

Each module ends in a human-review checkpoint. The profile and user-admin tracks can run in parallel once identity is done. Rankings needs profile's data (country, institution, technologies). The PWA can start any time after identity.

The remaining modules have no separate `SPEC-*.md`. Their contracts live in this file plus the decision log. Write separate specs only if you want them reviewed apart from the plan.

## Architecture Decisions

**Carried from the spec and map**
- Postgres enforces privileges. All writes go through NestJS with the service role.
- Guards look up the profile on every request.
- Cookie session through `@supabase/ssr`.

**Fresh-start amendments**
- **Folder layout follows your brief:**
  - `backend/src/auth/`: `AuthService`, `UserGuard`, `AdminGuard`, `OptionalAuthGuard`, `AccountService`, `GET /me`
  - `backend/src/users/`: `/me/profile`, `/me` deletion, `/admin/users`
  - `backend/src/rankings/`
  - `common/` keeps only the problem-details filter.
- **`GET /me`** (identity) returns `{id, email, role, status}`. It replaces "/me/skills still works" as the end-to-end proof, because there is no Skills module in a fresh repo. The frontend also uses it to gate the admin UI.
- **Multi-statement writes are SQL functions** called through `supabase.rpc`, executable by `service_role` only. That covers the profile update with its technologies, the role change with its audit row, and suspend with its audit row. PostgREST has no client-side transactions, so this is the only way to keep a write and its audit row atomic.
- **Dev Score is a SQL view** (`dev_scores`) computed on read. The leaderboard is a SQL function using `row_number()` over the eligible set. No materialization until it measurably needs it (`ponytail:` note at the view).
- **Tiers are computed in exactly one place**, a SQL `case` in the view. The frontend only displays them.
- **Countries:** stored as ISO alpha-2 codes. The list and validation come from `Intl.DisplayNames` with `fallback: 'none'`, in both Node and the browser. No country list dependency, no hand-written list.
- **Institutions:** preset list as a frontend constant plus "Other" free text. The DB groups them by `institution_key`.
- **PWA follows the Next 16 bundled guide:**
  - `app/manifest.ts`
  - icons generated with `next/og` `ImageResponse`, so there are no binary assets
  - a hand-written `public/sw.js` that caches only `/_next/static/*`, the icons and `/offline`
  - the guide's security headers for `sw.js`
  - Serwist is skipped: about 40 lines of service worker cover this cache policy

## API Contracts (define before parallel work)

All errors are RFC 7807. Every `:id` goes through `ParseUUIDPipe`.

| Method | Route | Guard | Request | Response |
|---|---|---|---|---|
| GET | `/me` | User | — | `{id, email, role, status}` |
| GET | `/me/profile` | User | — | `{id, email, username, role, avatarUrl, bio, country, institution, technologies: {id,name}[], visibility, createdAt, devScore, tier}` |
| PATCH | `/me/profile` | User | partial `{username, bio, country, institution, technologyIds[], visibility, avatarUrl}` | same as GET; `409` username taken |
| DELETE | `/me` | User | `{confirmUsername}` | `204` |
| GET | `/admin/users` | Admin | `?page=1&pageSize=20&role=&status=&q=` | `{items: {id,email,username,role,status,createdAt}[], total, page, pageSize}` |
| PATCH | `/admin/users/:id/role` | Admin | `{role}` | user row; `409` self-demotion or last admin |
| PATCH | `/admin/users/:id/status` | Admin | `{status: 'active'\|'suspended', reason}` | user row; `409` self |
| DELETE | `/admin/users/:id` | Admin | — | `204`; `409` self |
| GET | `/rankings` | Optional | `?scope=global\|country\|institution\|technology&value=&page=&pageSize=` | `{items: {rank,userId,username,avatarUrl,country,devScore,tier}[], total, me: {rank,devScore,tier,eligible} \| null}` |

The two rankings routes in the brief (`/rankings`, `/admin/users`) and `/me/profile` keep the brief's exact paths.

## Dependency Graph

```
identity T0─T11 ──┬─► profile  T12 schema ─► T13 API ─► T14 settings form ─► T15 avatar ─► T16 /profile ─► T17 self-delete
                  │                │
                  │                └──────────────────────────────┐
                  ├─► user-admin T18 list ─► T19 role ─► T20 suspend ─► T21 delete
                  │                                                │
                  │                          rankings T22 seed ─► T23 score SQL ─► T24 API ─► T25 page ─► T26 tier on profile
                  └─► pwa T27 manifest ─► T28 service worker ─► T29 install + offline banner
```

Can run in parallel: profile ∥ user-admin ∥ pwa. Both users-module tracks touch `users.module.ts`: whichever lands first creates it, the other only adds a controller. Rankings starts after T13.

## Task List (details in `tasks/todo.md`)

**identity**: T0 ✅ · T1–T11 (amended: `auth/` folder, `GET /me` in T4) → Checkpoints A–D
**profile**: T12–T17 → Checkpoint E
**user-admin**: T18–T21 → Checkpoint F
**rankings**: T22–T26 → Checkpoint G
**pwa**: T27–T29 → Checkpoint H (initiative done)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dev Score scale doesn't fit fixed tiers (2000/2500 may be unreachable or trivial depending on skill count) | High | T22 seeds realistic data; T23 prints the score distribution; thresholds sit in one SQL `case` and get recalibrated with you at Checkpoint G |
| Last admin demotes or suspends themselves → no one can administer | High | `admin_set_role` refuses to demote the last admin; endpoints refuse self-targeting |
| `.or()` / `ilike` search string injection in `/admin/users?q=` | Med | Escape `%`, `_`, `,`, `(`, `)` before building the filter; DTO max length 64 |
| Suspend half-applied (DB status set, Supabase ban call fails) | Med | DB status is authoritative (guards read it), so the suspension still takes effect. The ban only blocks token refresh; the endpoint is idempotent and the admin retries |
| Avatar CDN caching shows the old image after an upload | Low | Upload under a new timestamped filename; delete older files in the folder after the PATCH succeeds |
| Service worker caches a private page → shown to the next user on a shared device | High | SW caches only hashed static assets, icons and `/offline`; everything else is network-only. Checkpoint H inspects Cache Storage after browsing logged in |
| `experimental.useOffline` is experimental in Next 16.4 | Low | Used only for the offline banner (T29). If it misbehaves, drop the flag and use `online`/`offline` events |
| Leaderboard computed on read gets slow | Low (MVP) | `ponytail:` note on the view; upgrade to a materialized view refreshed on attempt validation |
| Seed users need `auth.users` rows | Low | T22 seeds through the Admin API (`auth.admin.createUser`), so the signup trigger runs exactly as in production |

## Open Questions (rankings/profile; answer before T23 / T16)

1. **Technology leaderboard meaning:**
   - (a) users who *declared* technology X, ranked by their global Dev Score
   - (b) everyone ranked by their score in *skills belonging to* technology X (Σ `level_score` of those skills)
   - Recommend **(b)**: (a) rewards ticking boxes, not skill.
2. **Dev Score v1 constants:**
   - Proposal: XP per *first* validated attempt = `{beginner: 10, intermediate: 20, advanced: 35, expert: 50}` × that attempt's accuracy, plus Σ `level_score` (0–100) of skills with ≥1 validated attempt.
   - The thresholds get recalibrated at Checkpoint G against seeded data. OK?
3. **Public profile page** (`/u/[username]`): not in the brief, skipped by default. Rankings rows link nowhere until it exists. Add it?
4. **GDPR data export** (right of access/portability): not in the brief, skipped by default. Add `GET /me/export`?
5. **Admin moderation scope**: role / suspend / delete only, or also "clear avatar/bio" for abusive content?
6. **Still blocking T1 / final Checkpoint A:** verify asymmetric JWT signing keys and obtain the shared owner's key-revocation confirmation. The dev project and env configuration, including the supplied backend secret key, are created. Real API smoke checks were attempted but must run from a network-enabled terminal; this agent shell denies outbound HTTP. MCP SQL verification has passed. No `postgres` npm dependency is needed.
