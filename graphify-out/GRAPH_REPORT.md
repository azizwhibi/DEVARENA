# Graph Report - DEVARENA  (2026-10-24)

## Corpus Check
- 342 files · ~153,938 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 8, (none) 3, .example 3)

## Summary
- 2295 nodes · 4900 edges · 134 communities (109 shown, 25 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 222 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `767bcf46`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- class-validator
- backend/package.json
- candidates.spec.ts
- react
- Phase 7 — `rankings`
- InvitationsService
- SupabaseService
- ListUsersQueryDto
- devDependencies
- messaging.controller.ts
- compilerOptions
- ProblemDetailsFilter
- ListCandidatesQueryDto
- compilerOptions
- ProfileForm.tsx
- guards.ts
- AuthUser
- next
- me-profile.controller.ts
- nextjs/package.json
- DevGuide.tsx
- apiRequest
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- duel.types.ts
- dependencies
- AdminMarketplace.tsx
- ForgotPasswordForm.tsx
- verify.mjs
- Tasks: `identity` module
- storage-smoke.mjs
- Spec: `identity` — Accounts, Sessions & Access Control
- backend/README.md
- check-admin.mjs
- jest
- seed-roles.mjs
- Email registration setup (T8)
- ref_node_assert
- apple-icon.tsx
- MeController
- TechnologiesService
- SkillsService
- check-recruiter-invitations-chat.mjs
- check-role-login.mjs
- Implementation Plan: DevArena User & Auth initiative
- CategoriesService
- knowledge.spec.ts
- SkillProgressService
- @nestjs/common
- SkillsWorkspace.tsx
- Identity database: T1–T3a
- nest-cli.json
- @nestjs/swagger
- marketplace.service.ts
- Automated evidence (2026-10-19)
- MarketplaceService
- check-pwa.mjs
- app/page.tsx
- Q: Which existing files should the login slice reuse?
- Q: How does the completed T7 header obtain its account data?
- Data Contract
- Identity precheck results — 2026-10-18
- skills/api.ts
- knowledge.controller.ts
- tsconfig.build.json
- skills.module.ts
- nextjs/README.md
- Frontend Contract
- Confirm your DevArena email template
- Phase 1 — Database
- ChallengeModal.tsx
- CatalogQueryDto
- sw.js
- (auth)/layout.tsx
- duel.ts
- SkillInsightsService
- engines
- nextjs/AGENTS.md
- Browser window with three toolbar controls
- MarketplaceController
- Document file icon with folded corner and text lines
- Globe icon
- Next.js wordmark
- Vercel white triangular logo
- ChallengeSkillsService
- ref_node_fs
- AdminMarketplaceController
- marketplace.controller.ts
- check-recruiter-candidates.mjs
- .check
- UpdateProfileDto
- useQuizDuel
- skills/types.ts
- InvitationsService
- recruiter/page.tsx
- skill-associations/page-client.tsx
- skill-progress.service.ts
- SetChallengeSkillsDto
- MeSkillsController
- admin-users.controller.ts
- dashboard/page-client.tsx
- my-skills/page-client.tsx
- useQuizDuel.ts
- duel.gateway.spec.ts
- Knowledge Management
- scripts
- check-knowledge.mjs
- GrantCreditsDto
- dependencies
- devDependencies
- DevArena
- marketplace.service.spec.ts
- SkillsDirectoryController
- marketplace-concurrent.mjs
- README.md
- AnimationKeyForKind
- slug-collisions.cjs
- Battle Code integration
- BYTE workspace guide
- Marketplace integration
- Aziz + Syrine integration
- Skills and Technology Management
- check-duel.mjs
- useSkillsAccount
- Phase 5 — `profile`
- .inventory
- check-register-http.mjs
- Run locally with CMD
- nextjs/eslint.config.mjs
- fakeStore

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 75 edges
2. `react` - 69 edges
3. `AuthUser` - 52 edges
4. `next` - 51 edges
5. `apiRequest()` - 40 edges
6. `SupabaseService` - 39 edges
7. `MarketplaceService` - 37 edges
8. `CurrentUser` - 31 edges
9. `@nestjs/swagger` - 28 edges
10. `AdminGuard` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Objective` --references--> `AdminGuard`  [INFERRED]
  SPEC-identity.md → backend/src/auth/guards.ts
- `T11: Bypass off, admin seed, success criteria` --references--> `AdminGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `T0: Workspace` --references--> `ProblemDetailsFilter`  [INFERRED]
  todo.md → backend/src/common/problem-details.filter.ts
- `GitHub + Google OAuth (T9)` --references--> `OAuthButtons()`  [INFERRED]
  docs/supabase-auth-setup.md → nextjs/src/components/auth/OAuthButtons.tsx
- `Features and mapping` --references--> `EquippedBadge()`  [INFERRED]
  docs/marketplace-integration.md → nextjs/src/components/marketplace/EquippedBadge.tsx

## Import Cycles
- None detected.

## Communities (134 total, 25 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.12
Nodes (26): Automated evidence (2026-10-19), Spec Success Criteria Status (SPEC-identity.md), emailTypes, GET(), LoginContent(), LoginPage(), metadata, LoginForm() (+18 more)

### Community 1 - "class-validator"
Cohesion: 0.07
Nodes (8): AdminUsersController, ListUsersQueryDto, UsersTable(), Phase 6 — `user-admin`, T18: List users (API + UI), T19: Change role, T20: Suspend / reactivate, T21: Delete user

### Community 2 - "backend/package.json"
Cohesion: 0.06
Nodes (32): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+24 more)

### Community 3 - "candidates.spec.ts"
Cohesion: 0.17
Nodes (11): AuthModule, DuelModule, SkillsModule, SupabaseModule, MockAuth, MockAuthAdmin, MockStorage, MockSupabaseClient (+3 more)

### Community 4 - "react"
Cohesion: 0.12
Nodes (19): hooks, AdminUsersContent(), AdminUsersPage(), instant, metadata, AdminUser, ListUsersResponse, UsersTableProps (+11 more)

### Community 5 - "Phase 7 — `rankings`"
Cohesion: 0.40
Nodes (5): Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T25: `/rankings` page, T26: Score and tier on `/profile`

### Community 7 - "SupabaseService"
Cohesion: 0.10
Nodes (22): AccountService, setup(), Database, Json, SupabaseService, MockAuth, MockAuthAdmin, MockStorage (+14 more)

### Community 8 - "ListUsersQueryDto"
Cohesion: 0.10
Nodes (16): metadata, RootLayout(), viewport, metadata, OfflinePage(), dismissed(), InstallEvent, InstallPrompt() (+8 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 10 - "messaging.controller.ts"
Cohesion: 0.10
Nodes (4): express-serve-static-core, Request, SendMessageDto, MessagingController

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "ProblemDetailsFilter"
Cohesion: 0.12
Nodes (10): AppModule, assertSafeAuthConfig(), AuthService, setup(), user, ProblemDetailsFilter, respond(), bootstrap() (+2 more)

### Community 14 - "ListCandidatesQueryDto"
Cohesion: 0.08
Nodes (5): RecruiterCandidatesController, ListCandidatesQueryDto, TechnologiesController, TechnologyItem, UsersService

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "ProfileForm.tsx"
Cohesion: 0.13
Nodes (18): countries, instant, metadata, ProfileContent(), ProfilePage(), EquippedBadge(), DEFAULT_TECHNOLOGIES, ProfileForm() (+10 more)

### Community 17 - "guards.ts"
Cohesion: 0.15
Nodes (13): Rule 5: Database Authoritative Security & Least Privilege Access, AdminGuard, OptionalAuthGuard, RecruiterGuard, UserGuard, AuthedRequest, AuthedRequest, AuthedRequest (+5 more)

### Community 18 - "AuthUser"
Cohesion: 0.12
Nodes (5): AuthUser, CurrentUser, AdminKnowledgeController, KnowledgeController, MyKnowledgeController

### Community 19 - "next"
Cohesion: 0.11
Nodes (15): nextConfig, InvitationsContent(), InvitationsPage(), metadata, MessagesContent(), MessagesPage(), MessagesPageProps, metadata (+7 more)

### Community 20 - "me-profile.controller.ts"
Cohesion: 0.12
Nodes (4): DeleteMeDto, MeProfileController, UserProfileResponse, T17: Self-service account deletion

### Community 21 - "nextjs/package.json"
Cohesion: 0.12
Nodes (15): engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name, private (+7 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.05
Nodes (53): aborted, controller, element, late, ready(), route(), storage, values (+45 more)

### Community 23 - "apiRequest"
Cohesion: 0.05
Nodes (85): EditKnowledgePage(), instant, instant, NewKnowledgePage(), instant, KnowledgeAdminPage(), instant, ResourcePage() (+77 more)

### Community 24 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 25 - "1. Prime Directives for All Agents"
Cohesion: 0.15
Nodes (12): 1. Prime Directives for All Agents, DevArena: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors (+4 more)

### Community 26 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 27 - "duel.types.ts"
Cohesion: 0.05
Nodes (39): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, safeSend(), DuelGateway (+31 more)

### Community 28 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+6 more)

### Community 29 - "AdminMarketplace.tsx"
Cohesion: 0.06
Nodes (61): AdminMarketplacePage(), instant, instant, MarketplacePage(), Account, AdminMarketplace(), archive(), grant() (+53 more)

### Community 30 - "ForgotPasswordForm.tsx"
Cohesion: 0.10
Nodes (23): ForgotPasswordPage(), metadata, metadata, RegisterPage(), metadata, ResetPasswordPage(), TickIcon(), ForgotPasswordForm() (+15 more)

### Community 31 - "verify.mjs"
Cohesion: 0.27
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 32 - "Tasks: `identity` module"
Cohesion: 0.12
Nodes (16): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+8 more)

### Community 33 - "storage-smoke.mjs"
Cohesion: 0.20
Nodes (8): admin, { createClient }, files, options, png, require, users, WebSocket

### Community 34 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.14
Nodes (13): `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Objective, Project Structure (new/changed only; reconciled with the real tree before planning), Resolved questions (2026-10-18) (+5 more)

### Community 35 - "backend/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 36 - "check-admin.mjs"
Cohesion: 0.20
Nodes (4): url1, url2, validRoles, validStatuses

### Community 37 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 38 - "seed-roles.mjs"
Cohesion: 0.22
Nodes (5): DEMO_USERS, __dirname, env, envPath, supabase

### Community 39 - "Email registration setup (T8)"
Cohesion: 0.29
Nodes (6): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration

### Community 40 - "ref_node_assert"
Cohesion: 0.13
Nodes (6): destination, originalNavigator, hooks, hooks, failures, hooks

### Community 41 - "apple-icon.tsx"
Cohesion: 0.33
Nodes (6): AppleIcon(), contentType, size, GET(), sizes, monogram()

### Community 42 - "MeController"
Cohesion: 0.22
Nodes (3): MeController, event(), T24: `GET /rankings`

### Community 43 - "TechnologiesService"
Cohesion: 0.08
Nodes (6): CreateTechnologyDto, UpdateTechnologyDto, slugify(), AuthedRequest, TechnologiesController, TechnologiesService

### Community 44 - "SkillsService"
Cohesion: 0.09
Nodes (4): ListSkillsDto, SkillsController, SkillsService, slugify()

### Community 46 - "check-role-login.mjs"
Cohesion: 0.31
Nodes (7): __dirname, resolve(), testHeaderLinks(), testLoginFormPersonaHandling(), testProxyNextRedirection(), testProxyRouteProtection(), testRegisterFormRecruiterRole()

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "knowledge.spec.ts"
Cohesion: 0.12
Nodes (14): KnowledgeCatalogueService, RESOURCE_SELECT, usableResource(), DIFFICULTY, KnowledgeImportService, normalizedImport(), parseCsv(), KnowledgeModule (+6 more)

### Community 50 - "SkillProgressService"
Cohesion: 0.10
Nodes (6): ATTEMPT_VALIDATED, AttemptValidatedEvent, AttemptValidatedListener, ProgressAdminController, SkillProgressService, @nestjs/event-emitter

### Community 51 - "@nestjs/common"
Cohesion: 0.11
Nodes (11): InvitationItem, InboundMessagePayload, MessagingGateway, MessagingModule, ConversationItem, ConversationParticipant, isSchemaCacheMissing(), MessageItem (+3 more)

### Community 52 - "SkillsWorkspace.tsx"
Cohesion: 0.11
Nodes (16): Shared implementation, AccountAvatar(), Account, AccountContext, AccountProvider(), useAccount(), useAccountState(), ApplicationShell() (+8 more)

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.29
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "@nestjs/swagger"
Cohesion: 0.13
Nodes (6): RespondInvitationDto, CreateSkillDto, UpdateSkillDto, class-transformer, class-validator, @nestjs/swagger

### Community 56 - "marketplace.service.ts"
Cohesion: 0.10
Nodes (14): SaveMarketplaceItemDto, KNOWN, mapMarketplaceError(), RpcFailure, isRecord(), ItemRow, MarketplaceDb, PurchaseRow (+6 more)

### Community 57 - "Automated evidence (2026-10-19)"
Cohesion: 0.50
Nodes (3): DevArena identity checks: T3a–T11 (Phase 4 Cutover), Live checks for the human (pending), Project graph

### Community 58 - "MarketplaceService"
Cohesion: 0.22
Nodes (4): isUnknownArray(), MarketplaceService, AdminMarketplaceItem, MarketplaceItem

### Community 59 - "check-pwa.mjs"
Cohesion: 0.33
Nodes (4): classify(), ctx, manifestSrc, sw

### Community 60 - "app/page.tsx"
Cohesion: 0.47
Nodes (4): Home(), steps, lines, TerminalHero()

### Community 61 - "Q: Which existing files should the login slice reuse?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which existing files should the login slice reuse?, Source Nodes

### Community 62 - "Q: How does the completed T7 header obtain its account data?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How does the completed T7 header obtain its account data?, Source Nodes

### Community 63 - "Data Contract"
Cohesion: 0.40
Nodes (5): Access control (D3, D4), Data Contract, Other schema changes, `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`), Triggers

### Community 64 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 65 - "skills/api.ts"
Cohesion: 0.10
Nodes (16): AdminPage(), run(), saveTech(), instant, Props, Reference, SkillFormModal(), StatsModal() (+8 more)

### Community 66 - "knowledge.controller.ts"
Cohesion: 0.17
Nodes (10): AdminKnowledgeQuery, DIFFICULTIES, EventDto, FeedbackDto, ImportDto, KnowledgeQuery, ProgressDto, RESOURCE_TYPES (+2 more)

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 68 - "skills.module.ts"
Cohesion: 0.17
Nodes (8): AssignmentsController, AuthRequest, MyAssignmentsController, PracticeDirectoryController, AssignmentsService, AttemptState, DIFFICULTY_ORDER, SupabaseService

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 70 - "Frontend Contract"
Cohesion: 0.40
Nodes (5): Env, Frontend Contract, Routes, Session, Supabase dashboard configuration (manual, documented in the plan)

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

### Community 73 - "ChallengeModal.tsx"
Cohesion: 0.09
Nodes (24): ArenaPage(), Challenge, instant, AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords(), ChallengeModal() (+16 more)

### Community 74 - "CatalogQueryDto"
Cohesion: 0.09
Nodes (3): CatalogController, CatalogService, CatalogQueryDto

### Community 77 - "duel.ts"
Cohesion: 0.08
Nodes (24): DuelClientEvent, DuelClientEventType, DuelDriverType, DuelErrorPayload, DuelJoinPayload, DuelMatchAcceptedUpdatePayload, DuelMatchAcceptPayload, DuelMatchCancelledPayload (+16 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.16
Nodes (3): MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 88 - "ref_node_fs"
Cohesion: 0.12
Nodes (13): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+5 more)

### Community 90 - "marketplace.controller.ts"
Cohesion: 0.18
Nodes (6): EquipDto, UnequipDto, userLimit, MarketplaceModule, MarketplaceUserThrottlerGuard, @nestjs/throttler

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.13
Nodes (9): apply, env, fs, input, { parseEnv }, path, __dirname, resolve() (+1 more)

### Community 94 - "UpdateProfileDto"
Cohesion: 0.14
Nodes (3): IsIsoCountry(), regionDisplayNames, UpdateProfileDto

### Community 95 - "useQuizDuel"
Cohesion: 0.24
Nodes (15): DuelPage(), instant, metadata, DuelArena(), resolveSolo(), soloResult(), soloRound(), useQuizDuel() (+7 more)

### Community 96 - "skills/types.ts"
Cohesion: 0.16
Nodes (13): Detail, SkillDetailContent(), SkillDetailPage(), instant, ChallengeCategory, ChallengeDifficulty, ChallengeState, ChallengeSummary (+5 more)

### Community 97 - "InvitationsService"
Cohesion: 0.18
Nodes (3): CreateInvitationDto, InvitationsService, isSchemaCacheMissing()

### Community 98 - "recruiter/page.tsx"
Cohesion: 0.21
Nodes (11): instant, metadata, RecruiterContent(), RecruiterPage(), POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps (+3 more)

### Community 99 - "skill-associations/page-client.tsx"
Cohesion: 0.18
Nodes (9): AssociationsPage(), find(), ChallengeSkills(), initialize(), Developer, DeveloperSkills(), Link, Reference (+1 more)

### Community 100 - "skill-progress.service.ts"
Cohesion: 0.25
Nodes (9): AttemptInput, computeLevel(), LevelResult, SkillStatus, statusFromScore(), DIFFICULTY_WEIGHT, MIN_ATTEMPTS, SCORING_VERSION (+1 more)

### Community 103 - "admin-users.controller.ts"
Cohesion: 0.20
Nodes (3): RequestWithUser, SetRoleDto, SetStatusDto

### Community 104 - "dashboard/page-client.tsx"
Cohesion: 0.27
Nodes (6): DashboardPage(), instant, ProfileProgress(), HistoryChart(), useSkillSummary(), SkillHistoryPoint

### Community 105 - "my-skills/page-client.tsx"
Cohesion: 0.29
Nodes (7): ProfilePage(), instant, RadarChart(), RadarChartProps, SkillCard(), SkillCardProps, SkillProgress

### Community 106 - "useQuizDuel.ts"
Cohesion: 0.29
Nodes (9): DEFAULT_DUEL_QUESTIONS, addResult(), BattleState, calculatePoints(), ROUND_TIME_MS, DuelServerEvent, PlayerRoundResult, PlayerStats (+1 more)

### Community 107 - "duel.gateway.spec.ts"
Cohesion: 0.24
Nodes (6): Session, connect(), ids, Message, signedIn(), wait()

### Community 108 - "Knowledge Management"
Cohesion: 0.18
Nodes (11): API, Configuration and startup (CMD), Coursera CSV import, Database and deployment, Frontend routes, Human-reviewed evaluation, Knowledge Management, Knowledge navigation validation (+3 more)

### Community 109 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, test:auth, test:duel, test:guide (+3 more)

### Community 110 - "check-knowledge.mjs"
Cohesion: 0.27
Nodes (6): evaluate(), fs, metrics(), hooks, require, react-dom

### Community 112 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, lucide-react, next, react, react-dom, @react-three/drei, @react-three/fiber, @supabase/ssr (+2 more)

### Community 113 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react, @types/react-dom (+2 more)

### Community 114 - "DevArena"
Cohesion: 0.22
Nodes (9): Battle Code setup, DevArena, Further documentation, Modules, Repository structure, Routes, Stack, Troubleshooting (+1 more)

### Community 115 - "marketplace.service.spec.ts"
Cohesion: 0.29
Nodes (7): Failure, itemRow, push(), Query, QueryResult, selects, tables

### Community 117 - "marketplace-concurrent.mjs"
Cohesion: 0.36
Nodes (4): ensureUsers(), psql(), psqlArgs(), walletLockVisible()

### Community 118 - "README.md"
Cohesion: 0.25
Nodes (4): Checks and limits, Completed presentation checklist, DevArena UI handoff, Translation and English-copy file inventory

### Community 120 - "slug-collisions.cjs"
Cohesion: 0.33
Nodes (5): assert, fs, path, { PGlite }, rows

### Community 121 - "Battle Code integration"
Cohesion: 0.33
Nodes (5): Battle Code integration, Database and startup, Host authentication and data, Included, Verification

### Community 122 - "BYTE workspace guide"
Cohesion: 0.33
Nodes (5): BYTE workspace guide, Implementation, Opening and replaying, Rendering and accessibility, Verification

### Community 123 - "Marketplace integration"
Cohesion: 0.33
Nodes (5): Checks and remaining verification, Features and mapping, Marketplace integration, Source and direction, SQL order and startup

### Community 124 - "Aziz + Syrine integration"
Cohesion: 0.33
Nodes (5): Aziz + Syrine integration, Database setup required, Routes, Run with CMD, Verification

### Community 125 - "Skills and Technology Management"
Cohesion: 0.33
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 126 - "check-duel.mjs"
Cohesion: 0.33
Nodes (5): question, resolve, result, state, wrong

### Community 127 - "useSkillsAccount"
Cohesion: 0.40
Nodes (4): DiscoverPage(), Technology, instant, useSkillsAccount()

### Community 128 - "Phase 5 — `profile`"
Cohesion: 0.33
Nodes (6): Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T13: `GET /me/profile` + `PATCH /me/profile`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data

### Community 130 - "check-register-http.mjs"
Cohesion: 0.40
Nodes (4): checks, href, link, rendered

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

## Knowledge Gaps
- **41 isolated node(s):** `@supabase/supabase-js`, `reflect-metadata`, `rxjs`, `@eslint/eslintrc`, `@nestjs/cli` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1015 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ListUsersQueryDto` to `safeNext`, `react`, `ProfileForm.tsx`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `ForgotPasswordForm.tsx`, `SkillsWorkspace.tsx`, `skills/api.ts`, `ChallengeModal.tsx`, `skills/types.ts`, `recruiter/page.tsx`, `skill-associations/page-client.tsx`, `dashboard/page-client.tsx`, `my-skills/page-client.tsx`, `useQuizDuel.ts`, `check-knowledge.mjs`, `useSkillsAccount`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `reflect-metadata`, `rxjs` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeNext` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `backend/package.json`, `candidates.spec.ts`, `SupabaseService`, `messaging.controller.ts`, `ProblemDetailsFilter`, `ListCandidatesQueryDto`, `guards.ts`, `AuthUser`, `me-profile.controller.ts`, `duel.types.ts`, `TechnologiesService`, `knowledge.spec.ts`, `SkillProgressService`, `@nestjs/swagger`, `marketplace.service.ts`, `knowledge.controller.ts`, `skills.module.ts`, `marketplace.controller.ts`, `skill-progress.service.ts`, `admin-users.controller.ts`, `duel.gateway.spec.ts`, `marketplace.service.spec.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `class-validator` be split into smaller, more focused modules?**
  _Cohesion score 0.06970128022759602 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `safeNext`, `skills/api.ts`, `recruiter/page.tsx`, `skills/types.ts`, `react`, `ListUsersQueryDto`, `ChallengeModal.tsx`, `dashboard/page-client.tsx`, `my-skills/page-client.tsx`, `apple-icon.tsx`, `ProfileForm.tsx`, `SkillsWorkspace.tsx`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `ForgotPasswordForm.tsx`, `useSkillsAccount`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._