# Graph Report - DEVARENA  (2026-10-19)

## Corpus Check
- 119 files · ~41,702 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .example 3, .ico 1)

## Summary
- 708 nodes · 1122 edges · 50 communities (33 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9adb2cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tasks: `identity` module
- auth.service.spec.ts
- createClient
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
- layout.tsx
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
- AGENTS.md
- nextjs/AGENTS.md
- sw.js
- offline/page.tsx
- (auth)/layout.tsx
- Spec: `identity` — Accounts, Sessions & Access Control
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- Implementation Plan: DevArena User & Auth initiative
- AdminPingController
- DevArena identity checks: T3a–T8
- UpdateProfileDto
- MeProfileController
- .deleteMe
- update-profile.dto.ts
- TechnologiesController
- .updateProfile
- UsersService
- check-register-http.mjs
- check-register.mjs
- check-pwa.mjs
- Identity precheck results — 2026-10-18

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 24 edges
2. `compilerOptions` - 22 edges
3. `@nestjs/common` - 21 edges
4. `next` - 21 edges
5. `Tasks: `identity` module` - 19 edges
6. `UpdateProfileDto` - 18 edges
7. `SupabaseService` - 17 edges
8. `react` - 17 edges
9. `compilerOptions` - 16 edges
10. `UsersService` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Objective` --references--> `AdminGuard`  [INFERRED]
  SPEC-identity.md → backend/src/auth/guards.ts
- `T11: Bypass off, admin seed, success criteria` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `T19: Change role` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `Tech Stack` --references--> `SupabaseService`  [INFERRED]
  SPEC-identity.md → backend/src/supabase/supabase.service.ts
- `Session` --references--> `useAuth()`  [INFERRED]
  SPEC-identity.md → nextjs/src/hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (50 total, 17 thin omitted)

### Community 0 - "Tasks: `identity` module"
Cohesion: 0.06
Nodes (32): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+24 more)

### Community 1 - "auth.service.spec.ts"
Cohesion: 0.06
Nodes (37): AppModule, AccountService, setup(), assertSafeAuthConfig(), AuthModule, AuthService, setup(), user (+29 more)

### Community 2 - "createClient"
Cohesion: 0.07
Nodes (42): nextConfig, hooks, destination, countries, metadata, ProfileContent(), ProfilePage(), metadata (+34 more)

### Community 3 - "backend/package.json"
Cohesion: 0.04
Nodes (46): author, description, engines, node, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+38 more)

### Community 4 - "RegisterForm.tsx"
Cohesion: 0.14
Nodes (17): ForgotPasswordPage(), metadata, metadata, RegisterPage(), metadata, ResetPasswordPage(), TickIcon(), ForgotPasswordForm() (+9 more)

### Community 5 - "nextjs/package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, devDependencies (+31 more)

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
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 13 - "verify.mjs"
Cohesion: 0.18
Nodes (10): Outstanding before Checkpoint A can be marked complete, before, bucket(), bucketBefore, local, migrations, psql(), root (+2 more)

### Community 14 - "layout.tsx"
Cohesion: 0.11
Nodes (19): metadata, RootLayout(), viewport, Home(), steps, lines, TerminalHero(), dismissed() (+11 more)

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
Cohesion: 0.09
Nodes (27): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration, emailTypes, GET() (+19 more)

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

### Community 34 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.07
Nodes (27): Access control (D3, D4), `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Data Contract, Env (+19 more)

### Community 35 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 36 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 38 - "DevArena identity checks: T3a–T8"
Cohesion: 0.40
Nodes (4): Automated evidence (2026-10-18), DevArena identity checks: T3a–T8, Live checks for the human (pending), Project graph

### Community 40 - "MeProfileController"
Cohesion: 0.22
Nodes (3): MeProfileController, UsersModule, T13: `GET /me/profile` + `PATCH /me/profile`

### Community 42 - "update-profile.dto.ts"
Cohesion: 0.38
Nodes (4): IsIsoCountry(), regionDisplayNames, class-transformer, class-validator

### Community 46 - "check-register-http.mjs"
Cohesion: 0.25
Nodes (5): hooks, checks, href, link, rendered

### Community 48 - "check-pwa.mjs"
Cohesion: 0.33
Nodes (4): classify(), ctx, manifestSrc, sw

### Community 49 - "Identity precheck results — 2026-10-18"
Cohesion: 0.40
Nodes (4): Cloud advisor results, Identity precheck results — 2026-10-18, T3a follow-up, 2026-10-18, Verification evidence

## Knowledge Gaps
- **330 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 410 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `RegisterForm.tsx`, `nextjs/package.json`, `layout.tsx`, `apple-icon.tsx`, `safeNext`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `ws` connect `storage-smoke.mjs` to `auth.service.spec.ts`, `backend/package.json`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `auth.service.spec.ts` to `backend/package.json`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tasks: `identity` module` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.service.spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.058254963427377224 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06777493606138107 - nodes in this community are weakly interconnected._