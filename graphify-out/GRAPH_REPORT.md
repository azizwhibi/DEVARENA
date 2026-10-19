# Graph Report - DEVARENA  (2026-10-19)

## Corpus Check
- 93 files · ~28,945 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .example 3, .ico 1)

## Summary
- 546 nodes · 798 edges · 34 communities (24 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a612132f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tasks: `identity` module
- auth.service.spec.ts
- createClient
- backend/package.json
- api.ts
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
- Email registration setup (T8)
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 22 edges
2. `Tasks: `identity` module` - 19 edges
3. `createClient()` - 18 edges
4. `compilerOptions` - 16 edges
5. `@nestjs/common` - 15 edges
6. `next` - 15 edges
7. `safeNext()` - 14 edges
8. `scripts` - 13 edges
9. `SupabaseService` - 12 edges
10. `react` - 11 edges

## Surprising Connections (you probably didn't know these)
- `T11: Bypass off, admin seed, success criteria` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `T19: Change role` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `GitHub + Google OAuth (T9)` --references--> `OAuthButtons()`  [INFERRED]
  docs/supabase-auth-setup.md → nextjs/src/components/auth/OAuthButtons.tsx
- `A1 (arena-ui): tokens, motion, landing, themed auth` --references--> `TickIcon()`  [INFERRED]
  todo.md → nextjs/src/components/arena/TickIcon.tsx
- `T7: `api.ts` Bearer + `useAuth` + logout` --references--> `useAuth()`  [INFERRED]
  todo.md → nextjs/src/hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (34 total, 10 thin omitted)

### Community 0 - "Tasks: `identity` module"
Cohesion: 0.06
Nodes (34): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+26 more)

### Community 1 - "auth.service.spec.ts"
Cohesion: 0.05
Nodes (38): AppModule, AccountService, setup(), assertSafeAuthConfig(), AuthModule, AuthService, setup(), user (+30 more)

### Community 2 - "createClient"
Cohesion: 0.07
Nodes (46): nextConfig, emailTypes, GET(), ForgotPasswordPage(), metadata, LoginContent(), LoginPage(), metadata (+38 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (44): author, description, engines, node, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+36 more)

### Community 4 - "api.ts"
Cohesion: 0.18
Nodes (9): hooks, ApiError, AuthUser, ProblemDetails, request(), apiRequest(), createClient(), config (+1 more)

### Community 5 - "nextjs/package.json"
Cohesion: 0.05
Nodes (37): eslintConfig, dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, devDependencies (+29 more)

### Community 6 - "storage-smoke.mjs"
Cohesion: 0.07
Nodes (20): destination, hooks, classify(), ctx, manifestSrc, sw, hooks, hooks (+12 more)

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
Cohesion: 0.12
Nodes (14): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence, before, bucket(), bucketBefore (+6 more)

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

### Community 18 - "Email registration setup (T8)"
Cohesion: 0.29
Nodes (6): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration

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

## Knowledge Gaps
- **283 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 325 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `apple-icon.tsx`, `api.ts`, `nextjs/package.json`, `layout.tsx`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `ws` connect `auth.service.spec.ts` to `backend/package.json`, `storage-smoke.mjs`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `Tasks: `identity` module` connect `Tasks: `identity` module` to `auth.service.spec.ts`, `createClient`, `layout.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tasks: `identity` module` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `auth.service.spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053297199638663056 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.0650103519668737 - nodes in this community are weakly interconnected._