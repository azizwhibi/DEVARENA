# Graph Report - DEVARENA  (2026-10-19)

## Corpus Check
- 76 files · ~20,259 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 548 nodes · 901 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.82)
- Token cost: host semantic usage unavailable; AST extraction runs locally

## Community Hubs (Navigation)
- Identity policies and deletion
- Backend authentication
- Frontend login and sessions
- Backend package configuration
- Identity verification records
- Frontend packages
- Verification runners
- Backend development tools
- Backend TypeScript settings
- Frontend TypeScript settings
- Registration setup
- Backend runtime libraries
- Backend scripts
- Verification runners
- Graph and project guidance
- Registration setup
- Nest build settings
- Registration setup
- Frontend documentation
- Backend documentation
- Backend build exclusions
- Registration setup
- Window icon
- File icon
- Globe icon
- Next.js logo
- Vercel logo

## God Nodes (most connected - your core abstractions)
1. `public.profiles` - 29 edges
2. `compilerOptions` - 22 edges
3. `supabase\migrations\20261018000002_identity_deletion.sql` - 18 edges
4. `Identity database README: T1–T3a` - 17 edges
5. `Schema/grant/policy/function/trigger/bucket semantic fingerprint` - 16 edges
6. `supabase\migrations\20261018000001_identity_profiles.sql` - 16 edges
7. `compilerOptions` - 16 edges
8. `@nestjs/common` - 15 edges
9. `supabase\tests\identity.sql` - 14 edges
10. `createClient()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Hosted Auth dashboard configuration` --references--> `Confirm your DevArena email template`  [EXTRACTED]
  docs/supabase-auth-setup.md → supabase/templates/confirmation.html
- `Project navigation rules` --references--> `Next.js agent rules`  [EXTRACTED]
  AGENTS.md → nextjs/AGENTS.md
- `Confirm your DevArena email template` --references--> `/auth/callback`  [EXTRACTED]
  supabase/templates/confirmation.html → docs/supabase-auth-setup.md
- `setup()` --calls--> `AccountService`  [EXTRACTED]
  backend/src/auth/account.service.spec.ts → backend/src/auth/account.service.ts
- `setup()` --calls--> `AuthService`  [EXTRACTED]
  backend/src/auth/auth.service.spec.ts → backend/src/auth/auth.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Profile read policy authorization** — supabase_migrations_20261018000001_identity_profiles_select_public, supabase_migrations_20261018000001_identity_profiles_select_own, supabase_migrations_20261018000001_identity_profiles_select_admin, supabase_migrations_20261018000001_identity_profiles_private_is_admin, supabase_migrations_20261018000001_identity_profiles_profile_public_column_select [EXTRACTED 1.00]
- **Database deletion protection and anonymization** — supabase_migrations_20261018000002_identity_deletion_public_scrub_profile_attempts, supabase_migrations_20261018000002_identity_deletion_profiles_scrub_attempts, supabase_migrations_20261018000002_identity_deletion_attempts_user_id_fkey, supabase_migrations_20261018000002_identity_deletion_public_audit_log, supabase_migrations_20261018000002_identity_deletion_avatars_bucket [EXTRACTED 1.00]
- **Account deletion contract** — supabase_readme_avatar_cleanup, supabase_readme_auth_admin_delete_user, supabase_readme_personal_data_cascade, supabase_readme_anonymous_attempt_analytics, supabase_readme_service_only_audit [EXTRACTED 1.00]

## Communities (27 total, 7 thin omitted)

### Community 0 - "Identity policies and deletion"
Cohesion: 0.06
Nodes (71): supabase\migrations\20261018000000_baseline_skills_tables.sql, public.ai_recommendations, public.attempts, public.challenges, public.profiles, public.skills, public.technologies, public.user_skill_history (+63 more)

### Community 1 - "Backend authentication"
Cohesion: 0.06
Nodes (29): AppModule, AccountService, setup(), assertSafeAuthConfig(), AuthModule, AuthService, setup(), user (+21 more)

### Community 2 - "Frontend login and sessions"
Cohesion: 0.08
Nodes (32): nextConfig, emailTypes, GET(), LoginContent(), LoginPage(), metadata, metadata, RegisterPage() (+24 more)

### Community 3 - "Backend package configuration"
Cohesion: 0.05
Nodes (45): author, description, engines, node, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+37 more)

### Community 4 - "Identity verification records"
Cohesion: 0.07
Nodes (29): Cloud security/performance advisor findings, T4/T5: 40 passing backend tests, Baseline unindexed foreign-key follow-ups, Dedicated DEV PostgreSQL 17.11 SQL proof, Identity precheck evidence, 2026-10-18, T6/T7: 11 safe-next assertions, 13 API scenarios, 19 local HTTP assertions, Local PostgreSQL 16.11 SQL proof, Pending live Auth/Storage, signing-key and revocation checks (+21 more)

### Community 5 - "Frontend packages"
Cohesion: 0.05
Nodes (36): @types/node, typescript, eslintConfig, dependencies, next, react, react-dom, @supabase/ssr (+28 more)

### Community 6 - "Verification runners"
Cohesion: 0.08
Nodes (17): hooks, destination, hooks, checks, href, link, rendered, @supabase/supabase-js (+9 more)

### Community 7 - "Backend development tools"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 8 - "Backend TypeScript settings"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 9 - "Frontend TypeScript settings"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "Registration setup"
Cohesion: 0.13
Nodes (13): /auth/callback, Dedicated DEV project qorlygdcfwnrrzvzulcz, public.profiles, Supabase redirect allow-list documentation, Email registration setup (T8), T10 password recovery, T9 OAuth, Supabase template variables documentation (+5 more)

### Community 11 - "Backend runtime libraries"
Cohesion: 0.15
Nodes (13): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/platform-express, @nestjs/swagger (+5 more)

### Community 12 - "Backend scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 13 - "Verification runners"
Cohesion: 0.19
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 14 - "Graph and project guidance"
Cohesion: 0.25
Nodes (5): Project navigation rules, Workspace SPEC-identity.md, CAPABILITY-MAP.md and tasks, graphify-out/graph.json, Next.js agent rules, Next.js generate-agent-files.js

### Community 15 - "Registration setup"
Cohesion: 0.25
Nodes (3): AuthHeader(), Browser apiRequest(), GET /me fixed id/email/role/status contract

### Community 16 - "Nest build settings"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 18 - "Frontend documentation"
Cohesion: 0.33
Nodes (6): create-next-app scaffold, Frontend README, Geist font, next/font optimization, Next.js frontend, Vercel deployment

### Community 19 - "Backend documentation"
Cohesion: 0.50
Nodes (4): Backend README, NestJS TypeScript backend starter, NestJS Mau deployment, Backend unit, end-to-end and coverage commands

### Community 20 - "Backend build exclusions"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

## Knowledge Gaps
- **227 isolated node(s):** `Request`, `Json`, `Account`, `ProblemDetails`, `supabase\tests\schema-fingerprint.sql` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `Verification runners` to `Backend authentication`, `Frontend login and sessions`, `Frontend packages`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `ws` connect `Verification runners` to `Backend authentication`, `Backend package configuration`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Backend development tools` to `Backend package configuration`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `Request`, `Json`, `Account` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Identity policies and deletion` be split into smaller, more focused modules?**
  _Cohesion score 0.06332992849846783 - nodes in this community are weakly interconnected._
- **Should `Backend authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.05981981981981982 - nodes in this community are weakly interconnected._
- **Should `Frontend login and sessions` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
## Extraction limitations

- SQL has manual semantic coverage because tree_sitter_sql is unavailable. This incremental update preserves those SQL nodes and relationships.
- The prior full extraction measured 2 self-links and 12 collapsed relationship pairs. An incremental update cannot reconstruct raw relations lost by that undirected export.
- Semantic token usage is unavailable; zero values from extraction are placeholders.
- The incremental merge coalesced two external package references with existing IDs. The preflight SQL query and its Markdown evidence now have distinct node IDs.
- T8 registration code passes local checks; hosted Auth settings, template installation and real email verification remain pending. See docs/supabase-auth-setup.md.
