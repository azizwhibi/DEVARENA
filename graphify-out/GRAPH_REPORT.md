# Graph Report - DEVARENA  (2026-10-20)

## Corpus Check
- 137 files · ~54,590 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .example 3, .ico 1)

## Summary
- 820 nodes · 1335 edges · 67 communities (52 shown, 15 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b8dc104`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- users.service.ts
- Implementation Plan: DevArena User & Auth initiative
- next
- backend/package.json
- RegisterForm.tsx
- nextjs/package.json
- storage-smoke.mjs
- devDependencies
- compilerOptions
- compilerOptions
- Confirm your DevArena email template
- dependencies
- scripts
- verify.mjs
- app/layout.tsx
- backend/README.md
- nest-cli.json
- apple-icon.tsx
- safeNext
- Identity database: T1–T3a
- tsconfig.build.json
- Q: Which existing files should the login slice reuse?
- Browser window with three toolbar controls
- Document file icon with folded corner and text lines
- Globe icon
- Next.js wordmark
- Vercel white triangular logo
- Q: How does the completed T7 header obtain its account data?
- nextjs/README.md
- 1. Prime Directives for All Agents
- nextjs/AGENTS.md
- sw.js
- offline/page.tsx
- (auth)/layout.tsx
- UsersService
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- Tasks: `identity` module
- jest
- backend/eslint.config.mjs
- engines
- .deleteMe
- UpdateProfileDto
- MeProfileController
- auth.service.spec.ts
- class-validator
- app/page.tsx
- check-admin.mjs
- SetStatusDto
- Phase 5 — `profile`
- MeController
- seed-roles.mjs
- ref_node_assert
- ProblemDetailsFilter
- ref_node_fs
- check-role-login.mjs
- check-pwa.mjs
- Identity precheck results — 2026-10-18
- @nestjs/common
- Spec: `identity` — Accounts, Sessions & Access Control
- auth.module.ts
- admin-users.spec.ts
- .delete
- Data Contract
- Frontend Contract
- Phase 7 — `rankings`
- Phase 1 — Database
- Phase 0 — Setup

## God Nodes (most connected - your core abstractions)
1. `next` - 26 edges
2. `@nestjs/common` - 22 edges
3. `UsersService` - 22 edges
4. `compilerOptions` - 22 edges
5. `react` - 21 edges
6. `createClient()` - 21 edges
7. `SupabaseService` - 18 edges
8. `UpdateProfileDto` - 18 edges
9. `Tasks: `identity` module` - 18 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Objective` --references--> `AdminGuard`  [INFERRED]
  SPEC-identity.md → backend/src/auth/guards.ts
- `T11: Bypass off, admin seed, success criteria` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `Tech Stack` --references--> `SupabaseService`  [INFERRED]
  SPEC-identity.md → backend/src/supabase/supabase.service.ts
- `Session` --references--> `useAuth()`  [INFERRED]
  SPEC-identity.md → nextjs/src/hooks/useAuth.ts
- `T7: `api.ts` Bearer + `useAuth` + logout` --references--> `useAuth()`  [INFERRED]
  todo.md → nextjs/src/hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (67 total, 15 thin omitted)

### Community 0 - "users.service.ts"
Cohesion: 0.17
Nodes (11): AccountService, setup(), Database, Json, SupabaseService, AdminUserItem, ListUsersResult, MockAccountService (+3 more)

### Community 1 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 2 - "next"
Cohesion: 0.05
Nodes (53): nextConfig, hooks, countries, AdminUsersContent(), AdminUsersPage(), metadata, metadata, ProfileContent() (+45 more)

### Community 3 - "backend/package.json"
Cohesion: 0.07
Nodes (29): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+21 more)

### Community 4 - "RegisterForm.tsx"
Cohesion: 0.14
Nodes (17): ForgotPasswordPage(), metadata, metadata, RegisterPage(), metadata, ResetPasswordPage(), TickIcon(), ForgotPasswordForm() (+9 more)

### Community 5 - "nextjs/package.json"
Cohesion: 0.05
Nodes (37): eslintConfig, dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, devDependencies (+29 more)

### Community 6 - "storage-smoke.mjs"
Cohesion: 0.17
Nodes (9): ws, admin, { createClient }, files, options, png, require, users (+1 more)

### Community 7 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 11 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/platform-express, @nestjs/swagger (+5 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 13 - "verify.mjs"
Cohesion: 0.24
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 14 - "app/layout.tsx"
Cohesion: 0.13
Nodes (13): metadata, RootLayout(), viewport, AuthHeader(), dismissed(), InstallEvent, InstallPrompt(), OfflineBanner() (+5 more)

### Community 15 - "backend/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 16 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 17 - "apple-icon.tsx"
Cohesion: 0.33
Nodes (6): AppleIcon(), contentType, size, GET(), sizes, monogram()

### Community 18 - "safeNext"
Cohesion: 0.07
Nodes (37): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration, Automated evidence (2026-10-19), DevArena identity checks: T3a–T11 (Phase 4 Cutover) (+29 more)

### Community 19 - "Identity database: T1–T3a"
Cohesion: 0.29
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 20 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 21 - "Q: Which existing files should the login slice reuse?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which existing files should the login slice reuse?, Source Nodes

### Community 27 - "Q: How does the completed T7 header obtain its account data?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How does the completed T7 header obtain its account data?, Source Nodes

### Community 28 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 29 - "1. Prime Directives for All Agents"
Cohesion: 0.14
Nodes (13): 1. Prime Directives for All Agents, GoogleGuard AI: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: GDPR / DSGVO Zero Raw PII Logging (+5 more)

### Community 34 - "UsersService"
Cohesion: 0.05
Nodes (11): AdminUsersController, ListUsersQueryDto, TechnologiesController, TechnologyItem, UsersService, UsersTable(), Phase 6 — `user-admin`, T18: List users (API + UI) (+3 more)

### Community 35 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 36 - "Tasks: `identity` module"
Cohesion: 0.17
Nodes (11): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+3 more)

### Community 37 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 38 - "backend/eslint.config.mjs"
Cohesion: 0.40
Nodes (4): @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 43 - "auth.service.spec.ts"
Cohesion: 0.15
Nodes (12): assertSafeAuthConfig(), AuthService, setup(), user, AdminGuard, OptionalAuthGuard, RecruiterGuard, UserGuard (+4 more)

### Community 44 - "class-validator"
Cohesion: 0.21
Nodes (5): IsIsoCountry(), regionDisplayNames, SetRoleDto, class-transformer, class-validator

### Community 45 - "app/page.tsx"
Cohesion: 0.47
Nodes (4): Home(), steps, lines, TerminalHero()

### Community 46 - "check-admin.mjs"
Cohesion: 0.20
Nodes (4): url1, url2, validRoles, validStatuses

### Community 48 - "Phase 5 — `profile`"
Cohesion: 0.25
Nodes (7): UsersModule, Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T13: `GET /me/profile` + `PATCH /me/profile`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data

### Community 50 - "seed-roles.mjs"
Cohesion: 0.20
Nodes (5): DEMO_USERS, __dirname, env, envPath, supabase

### Community 51 - "ref_node_assert"
Cohesion: 0.25
Nodes (3): destination, hooks, hooks

### Community 52 - "ProblemDetailsFilter"
Cohesion: 0.22
Nodes (6): AppModule, ProblemDetailsFilter, respond(), bootstrap(), RFC-7807, @nestjs/core

### Community 53 - "ref_node_fs"
Cohesion: 0.25
Nodes (5): hooks, checks, href, link, rendered

### Community 54 - "check-role-login.mjs"
Cohesion: 0.36
Nodes (5): __dirname, resolve(), testHeaderLinks(), testProxyRouteProtection(), testRegisterFormRecruiterRole()

### Community 55 - "check-pwa.mjs"
Cohesion: 0.33
Nodes (4): classify(), ctx, manifestSrc, sw

### Community 56 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 57 - "@nestjs/common"
Cohesion: 0.32
Nodes (7): AuthUser, express-serve-static-core, Request, CurrentUser, RequestWithUser, @nestjs/common, @nestjs/swagger

### Community 58 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.18
Nodes (10): `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Objective, Project Structure (new/changed only; reconciled with the real tree before planning), Resolved questions (2026-10-18) (+2 more)

### Community 59 - "auth.module.ts"
Cohesion: 0.42
Nodes (3): AuthModule, SupabaseModule, @nestjs/config

### Community 60 - "admin-users.spec.ts"
Cohesion: 0.22
Nodes (7): MockAuth, MockAuthAdmin, MockStorage, MockSupabaseClient, MockSupabaseService, escapeSearchTerm(), @nestjs/testing

### Community 61 - ".delete"
Cohesion: 0.29
Nodes (5): Success Criteria, Superseded open questions (kept for history), Testing Strategy, Phase 2 — Backend, T5: `AccountService.delete`

### Community 62 - "Data Contract"
Cohesion: 0.40
Nodes (5): Access control (D3, D4), Data Contract, Other schema changes, `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`), Triggers

### Community 63 - "Frontend Contract"
Cohesion: 0.40
Nodes (5): Env, Frontend Contract, Routes, Session, Supabase dashboard configuration (manual, documented in the plan)

### Community 64 - "Phase 7 — `rankings`"
Cohesion: 0.40
Nodes (5): Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T25: `/rankings` page, T26: Score and tier on `/profile`

### Community 65 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

### Community 66 - "Phase 0 — Setup"
Cohesion: 0.67
Nodes (3): Phase 0 — Setup, T0: Workspace, T1: Secrets, Supabase project, schema snapshot

## Knowledge Gaps
- **42 isolated node(s):** `@nestjs/platform-express`, `@supabase/supabase-js`, `reflect-metadata`, `rxjs`, `@eslint/eslintrc` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 473 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `RegisterForm.tsx`, `nextjs/package.json`, `app/layout.tsx`, `apple-icon.tsx`, `safeNext`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `@nestjs/platform-express`, `@supabase/supabase-js`, `reflect-metadata` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.05329153605015674 - nodes in this community are weakly interconnected._
- **Why does `ws` connect `storage-smoke.mjs` to `users.service.ts`, `backend/package.json`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `AdminGuard` connect `auth.service.spec.ts` to `UsersService`, `Tasks: `identity` module`, `safeNext`, `@nestjs/common`, `Spec: `identity` — Accounts, Sessions & Access Control`, `auth.module.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `RegisterForm.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._