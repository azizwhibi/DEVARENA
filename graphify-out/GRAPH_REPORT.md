# Graph Report - DEVARENA  (2026-10-26)

## Corpus Check
- 382 files · ~182,535 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 4, .example 1)

## Summary
- 2655 nodes · 5598 edges · 155 communities (126 shown, 29 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 332 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0dca83da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- duel.gateway.ts
- backend/package.json
- app.module.ts
- duel.types.ts
- knowledge.controller.ts
- dashboard/page-client.tsx
- users/page.tsx
- next
- devDependencies
- SendMessageDto
- compilerOptions
- skills/types.ts
- SupabaseService
- compilerOptions
- rankings/page-client.tsx
- guards.ts
- UsersService
- next
- MeProfileController
- nextjs/package.json
- DevGuide.tsx
- KnowledgeDetail.tsx
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- DuelGateway
- dependencies
- AdminMarketplace.tsx
- RegisterForm.tsx
- verify.mjs
- Spec: `identity` — Accounts, Sessions & Access Control
- ref_node_module
- InvitationsController
- backend/README.md
- check-admin.mjs
- jest
- seed-roles.mjs
- Email registration setup (T8)
- seed-roles.mjs
- apple-icon.tsx
- MeController
- TechnologiesService
- SkillsService
- ListUsersQueryDto
- check-role-login.mjs
- Implementation Plan: DevArena User & Auth initiative
- CategoriesService
- auth.service.ts
- CreateInvitationDto
- sendInvitation
- rankings.service.ts
- Identity database: T1–T3a
- nest-cli.json
- @nestjs/swagger
- marketplace.service.ts
- users.service.ts
- MarketplaceService
- knowledge.controller.ts
- app/page.tsx
- Q: Which existing files should the login slice reuse?
- Q: How does the completed T7 header obtain its account data?
- DuelRoomService
- Identity precheck results — 2026-10-18
- MarketplaceController
- .check
- tsconfig.build.json
- InvitationsService
- nextjs/README.md
- AdminUsersController
- Confirm your DevArena email template
- Spec: `invitation-delivery` — Recruiter Candidate Invitation Delivery
- ChallengeModal.tsx
- CatalogQueryDto
- sw.js
- (auth)/layout.tsx
- duel.ts
- SkillInsightsService
- engines
- nextjs/AGENTS.md
- Browser window with three toolbar controls
- Spec: `developer-invitations` — Recruiter Invitations for Developers
- Document file icon with folded corner and text lines
- Globe icon
- Next.js wordmark
- Vercel white triangular logo
- MessagingGateway
- ref_node_assert
- AdminMarketplaceController
- ChallengeSkillsService
- check-recruiter-candidates.mjs
- .delete
- .assign
- UpdateProfileDto
- RankingsController
- apiRequest
- Tasks: `identity` module
- RecruiterDashboard.tsx
- skill-associations/page-client.tsx
- Detailed Changes
- RankRewardListener
- challenge-grading.ts
- useQuizDuel
- check-competitive-results.mjs
- skills/api.ts
- Phase 5 — `profile`
- ProgressAdminController
- Knowledge Management
- scripts
- check-rankings.mjs
- GrantCreditsDto
- dependencies
- devDependencies
- DevArena
- marketplace.service.spec.ts
- SkillsDirectoryController
- AuthUser
- Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)
- AnimationKeyForKind
- Tasks: `role-workflows`
- Battle Code integration
- BYTE workspace guide
- README.md
- Aziz + Syrine integration
- Skills and Technology Management
- Phase 10 — Demo Account Sign-In & Account Availability Resilience
- OfflineDashboard
- @nestjs/common
- storage-smoke.mjs
- Run locally with CMD
- Tasks: Dynamic Scoring & WebSocket Chat Fix
- marketplace-concurrent.mjs
- ProfileProgress
- rankings.controller.ts
- SetStatusDto
- ListCandidatesQueryDto
- RankingsQueryDto
- DevArena UI handoff
- Competitive rankings and rank rewards (T53–T57)
- class-validator
- useSkillsAccount
- nextjs/eslint.config.mjs
- useQuizDuel.ts
- WorkspaceIcon
- next
- marketplace.controller.ts
- Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility
- Data Contract
- RespondInvitationDto
- (skills)/duel/page.tsx
- Phase 1 — Database
- Frontend Contract
- check-duel.mjs

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 85 edges
2. `react` - 72 edges
3. `next` - 56 edges
4. `AuthUser` - 52 edges
5. `SupabaseService` - 46 edges
6. `apiRequest()` - 42 edges
7. `MarketplaceService` - 37 edges
8. `CurrentUser` - 31 edges
9. `SupabaseService` - 31 edges
10. `@nestjs/swagger` - 30 edges

## Surprising Connections (you probably didn't know these)
- `1. Developer Attempt API: `POST /me/challenges/:challengeId/attempt`` --references--> `UserGuard`  [INFERRED]
  SPEC-practice-scoring.md → backend/src/auth/guards.ts
- `3. Risks & Mitigations` --references--> `UserGuard`  [INFERRED]
  tasks/plan.md → backend/src/auth/guards.ts
- `T45: Backend Attempt Endpoint: `POST /me/skills/challenges/:id/attempt`` --references--> `UserGuard`  [INFERRED]
  tasks/todo.md → backend/src/auth/guards.ts
- `T45: Backend Attempt Endpoint: `POST /me/skills/challenges/:id/attempt`` --references--> `UserGuard`  [INFERRED]
  todo.md → backend/src/auth/guards.ts
- `Objective` --references--> `AdminGuard`  [INFERRED]
  SPEC-identity.md → backend/src/auth/guards.ts

## Import Cycles
- None detected.

## Communities (155 total, 29 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.08
Nodes (34): emailTypes, GET(), LoginContent(), LoginPage(), metadata, LoginForm(), handleDemoLogin(), loginWithCredentials() (+26 more)

### Community 1 - "duel.gateway.ts"
Cohesion: 0.18
Nodes (11): Session, connect(), ids, Message, signedIn(), wait(), DuelServerEvent, isSchemaCacheMissing() (+3 more)

### Community 2 - "backend/package.json"
Cohesion: 0.07
Nodes (31): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+23 more)

### Community 3 - "app.module.ts"
Cohesion: 0.10
Nodes (20): AppModule, AuthModule, DuelModule, KnowledgeModule, SkillsModule, SupabaseModule, MockAuth, MockAuthAdmin (+12 more)

### Community 4 - "duel.types.ts"
Cohesion: 0.09
Nodes (33): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, AuthenticatedPlayer, DuelClientEvent (+25 more)

### Community 5 - "knowledge.controller.ts"
Cohesion: 0.13
Nodes (16): KnowledgeCatalogueService, RESOURCE_SELECT, usableResource(), DIFFICULTIES, RESOURCE_TYPES, UpdateResourceDto, DIFFICULTY, KnowledgeImportService (+8 more)

### Community 6 - "dashboard/page-client.tsx"
Cohesion: 0.31
Nodes (5): DashboardPage(), instant, HistoryChart(), useSkillSummary(), SkillHistoryPoint

### Community 7 - "users/page.tsx"
Cohesion: 0.17
Nodes (13): AdminUsersContent(), AdminUsersPage(), instant, metadata, AdminUser, ListUsersResponse, UsersTable(), UsersTableProps (+5 more)

### Community 8 - "next"
Cohesion: 0.07
Nodes (31): Shared implementation, metadata, RootLayout(), viewport, ArenaPage(), Challenge, instant, AccountAvatar() (+23 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "skills/types.ts"
Cohesion: 0.15
Nodes (14): Detail, SkillDetailContent(), SkillDetailPage(), instant, ChallengeModal(), pickRandom(), ChallengeCategory, ChallengeDifficulty (+6 more)

### Community 14 - "SupabaseService"
Cohesion: 0.10
Nodes (14): AccountService, setup(), fakeStore(), from(), result(), InvitationItem, ConversationItem, ConversationParticipant (+6 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "rankings/page-client.tsx"
Cohesion: 0.11
Nodes (23): countries, countries, RankingsPage(), scopes, metadata, Page(), MyStanding(), number (+15 more)

### Community 17 - "guards.ts"
Cohesion: 0.11
Nodes (19): Rule 5: Database Authoritative Security & Least Privilege Access, AuthService, setup(), user, AdminGuard, DeveloperGuard, OptionalAuthGuard, RecruiterGuard (+11 more)

### Community 19 - "next"
Cohesion: 0.10
Nodes (25): hooks, InvitationsContent(), InvitationsPage(), metadata, MessagesContent(), MessagesPage(), MessagesPageProps, metadata (+17 more)

### Community 20 - "MeProfileController"
Cohesion: 0.11
Nodes (4): DeleteMeDto, MeProfileController, UserProfileResponse, T17: Self-service account deletion

### Community 21 - "nextjs/package.json"
Cohesion: 0.12
Nodes (15): engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name, private (+7 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.05
Nodes (53): aborted, controller, element, late, ready(), route(), storage, values (+45 more)

### Community 23 - "KnowledgeDetail.tsx"
Cohesion: 0.06
Nodes (83): EditKnowledgePage(), instant, instant, NewKnowledgePage(), instant, KnowledgeAdminPage(), instant, ResourcePage() (+75 more)

### Community 24 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 25 - "1. Prime Directives for All Agents"
Cohesion: 0.17
Nodes (11): 1. Prime Directives for All Agents, DevArena: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors (+3 more)

### Community 26 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 27 - "DuelGateway"
Cohesion: 0.10
Nodes (13): DuelGateway, Boundaries, Commands, Detailed Changes, Open Questions, Spec: `ws-chat` — WebSocket Chat Fix (Recruiter ↔ Developer), Success Criteria, Success looks like (+5 more)

### Community 28 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+6 more)

### Community 29 - "AdminMarketplace.tsx"
Cohesion: 0.06
Nodes (61): AdminMarketplacePage(), instant, instant, MarketplacePage(), Account, AdminMarketplace(), archive(), grant() (+53 more)

### Community 30 - "RegisterForm.tsx"
Cohesion: 0.10
Nodes (23): ForgotPasswordPage(), metadata, metadata, RegisterPage(), metadata, ResetPasswordPage(), TickIcon(), ForgotPasswordForm() (+15 more)

### Community 31 - "verify.mjs"
Cohesion: 0.24
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 32 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.18
Nodes (10): `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Objective, Project Structure (new/changed only; reconciled with the real tree before planning), Resolved questions (2026-10-18) (+2 more)

### Community 33 - "ref_node_module"
Cohesion: 0.13
Nodes (5): originalNavigator, hooks, hooks, failures, hooks

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
Cohesion: 0.14
Nodes (5): __dirname, resolve(), testInvitationDelivery(), testPrivacyCompliance(), __dirname

### Community 39 - "Email registration setup (T8)"
Cohesion: 0.29
Nodes (6): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration

### Community 40 - "seed-roles.mjs"
Cohesion: 0.13
Nodes (10): DEMO_USERS, __dirname, env, envPath, supabase, assert, fs, path (+2 more)

### Community 41 - "apple-icon.tsx"
Cohesion: 0.33
Nodes (6): AppleIcon(), contentType, size, GET(), sizes, monogram()

### Community 42 - "MeController"
Cohesion: 0.22
Nodes (3): MeController, event(), Success Criteria

### Community 43 - "TechnologiesService"
Cohesion: 0.08
Nodes (6): CreateTechnologyDto, UpdateTechnologyDto, slugify(), AuthedRequest, TechnologiesController, TechnologiesService

### Community 44 - "SkillsService"
Cohesion: 0.09
Nodes (4): ListSkillsDto, SkillsController, SkillsService, slugify()

### Community 46 - "check-role-login.mjs"
Cohesion: 0.24
Nodes (11): __dirname, resolve(), testAccountProviderResilience(), testChallengesAccessProtection(), testHeaderLinks(), testLoginFormPersonaHandling(), testProfileRoleBoundaries(), testProxyNextRedirection() (+3 more)

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "auth.service.ts"
Cohesion: 0.17
Nodes (8): Rule 7: Full-Stack Modular Architecture & RFC-7807 Standard, assertSafeAuthConfig(), ProblemDetailsFilter, respond(), bootstrap(), InboundMessagePayload, @nestjs/core, @nestjs/platform-express

### Community 51 - "sendInvitation"
Cohesion: 0.16
Nodes (14): sendInvitation(), 5. Testing Strategy, 6. Boundaries, 7. Success Criteria, Phase 20 — Recruiter Candidate Invitation Delivery (`invitation-delivery`), T49: Specification for Candidate Invitation Delivery, T50: Wire `sendInvitation` into `RecruiterDashboard.tsx`, T51: Automated Verification Tests in `check-recruiter-candidates.mjs` (+6 more)

### Community 52 - "rankings.service.ts"
Cohesion: 0.22
Nodes (7): isSchemaCacheMissing(), MyRank, RankingItem, RankingRow, RankingScore, RankingsResponse, RankingsService

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.29
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "@nestjs/swagger"
Cohesion: 0.12
Nodes (7): AuthRequest, AuthedRequest, CreateSkillDto, UpdateSkillDto, AuthedRequest, RFC-7807, @nestjs/swagger

### Community 56 - "marketplace.service.ts"
Cohesion: 0.10
Nodes (15): SaveMarketplaceItemDto, KNOWN, mapMarketplaceError(), RpcFailure, isRecord(), ItemRow, MarketplaceDb, PurchaseRow (+7 more)

### Community 57 - "users.service.ts"
Cohesion: 0.22
Nodes (8): Json, AdminUserItem, CandidateItem, FALLBACK_TECHNOLOGIES, ListCandidatesResult, ListUsersResult, TechnologyItem, TechRow

### Community 58 - "MarketplaceService"
Cohesion: 0.21
Nodes (4): isUnknownArray(), MarketplaceService, Inventory, MarketplaceItem

### Community 59 - "knowledge.controller.ts"
Cohesion: 0.19
Nodes (5): AdminKnowledgeQuery, ImportDto, KnowledgeQuery, ProgressDto, ResourceDto

### Community 60 - "app/page.tsx"
Cohesion: 0.47
Nodes (4): Home(), steps, lines, TerminalHero()

### Community 61 - "Q: Which existing files should the login slice reuse?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which existing files should the login slice reuse?, Source Nodes

### Community 62 - "Q: How does the completed T7 header obtain its account data?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How does the completed T7 header obtain its account data?, Source Nodes

### Community 63 - "DuelRoomService"
Cohesion: 0.14
Nodes (5): safeSend(), DuelMatchmakingService, DuelRoomService, DuelRoomSession, WaitingPlayer

### Community 64 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 66 - ".check"
Cohesion: 0.10
Nodes (4): AdminKnowledgeController, EventDto, FeedbackDto, KnowledgeLearningService

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "Spec: `invitation-delivery` — Recruiter Candidate Invitation Delivery"
Cohesion: 0.25
Nodes (7): 1. Objective, 2. Tech Stack & Commands, 3. Project Structure, 4. Code Style & Implementation Details, Client Action in `RecruiterDashboard.tsx`, Spec: `invitation-delivery` — Recruiter Candidate Invitation Delivery, Who benefits

### Community 73 - "ChallengeModal.tsx"
Cohesion: 0.10
Nodes (20): AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords(), ChallengeModalProps, DEBUGGING_TRACEBACK_QUESTIONS, DOCKER_QUESTIONS, FLUTTER_QUESTIONS (+12 more)

### Community 74 - "CatalogQueryDto"
Cohesion: 0.09
Nodes (3): CatalogController, CatalogService, CatalogQueryDto

### Community 77 - "duel.ts"
Cohesion: 0.07
Nodes (26): DuelClientEvent, DuelClientEventType, DuelDriverType, DuelErrorPayload, DuelJoinPayload, DuelMatchAcceptedUpdatePayload, DuelMatchAcceptPayload, DuelMatchCancelledPayload (+18 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.16
Nodes (3): MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 82 - "Spec: `developer-invitations` — Recruiter Invitations for Developers"
Cohesion: 0.15
Nodes (12): 1. Navigation Access in `AuthHeader.tsx`, 2. Developer View in `InvitationsManager.tsx`, 3. Dashboard Widget in `dashboard/page-client.tsx`, Boundaries, Commands, Detailed Changes, Objective, Spec: `developer-invitations` — Recruiter Invitations for Developers (+4 more)

### Community 87 - "MessagingGateway"
Cohesion: 0.09
Nodes (13): MessagingController, MessagingGateway, MessagingModule, isSchemaCacheMissing(), MessagingService, Objective, Root cause, What exists and works (once wired) (+5 more)

### Community 88 - "ref_node_assert"
Cohesion: 0.09
Nodes (18): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+10 more)

### Community 90 - "ChallengeSkillsService"
Cohesion: 0.07
Nodes (5): AuthedRequest, ChallengeSkillsController, ChallengeSkillsService, ChallengeSkillItemDto, SetChallengeSkillsDto

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.22
Nodes (6): apply, env, fs, input, { parseEnv }, path

### Community 92 - ".delete"
Cohesion: 0.29
Nodes (5): Success Criteria, Superseded open questions (kept for history), Testing Strategy, Phase 2 — Backend, T5: `AccountService.delete`

### Community 93 - ".assign"
Cohesion: 0.14
Nodes (4): AssignmentsController, MyAssignmentsController, PracticeDirectoryController, AssignmentsService

### Community 94 - "UpdateProfileDto"
Cohesion: 0.14
Nodes (3): IsIsoCountry(), regionDisplayNames, UpdateProfileDto

### Community 95 - "RankingsController"
Cohesion: 0.29
Nodes (4): RankingsController, Phase 14 — Rankings API & Profile Integration (`scoring`), T41: `RankingsModule` & `GET /rankings` API, T42: Integrate `devScore` & `tier` into `UsersService.getProfile()`

### Community 96 - "apiRequest"
Cohesion: 0.18
Nodes (13): AvatarUpload(), handleFileChange(), AvatarUploadProps, VALID_EXTENSIONS, DangerZone(), handleDelete(), DangerZoneProps, DEFAULT_TECHNOLOGIES (+5 more)

### Community 97 - "Tasks: `identity` module"
Cohesion: 0.12
Nodes (16): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+8 more)

### Community 98 - "RecruiterDashboard.tsx"
Cohesion: 0.31
Nodes (7): POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps, buildCandidatesQuery(), CandidateItem, CandidatesResponse

### Community 99 - "skill-associations/page-client.tsx"
Cohesion: 0.18
Nodes (9): AssociationsPage(), find(), ChallengeSkills(), initialize(), Developer, DeveloperSkills(), Link, Reference (+1 more)

### Community 100 - "Detailed Changes"
Cohesion: 0.18
Nodes (10): 1. `useSkillSummary.ts` Median Dev Score Calculation, 2. Developer Dashboard Score Card, 3. Profile Progress Component, 4. Account Menu in `AuthHeader.tsx`, Boundaries, Detailed Changes, Objective, Spec: `user-scores-ui` — Developer Score & Tier Visibility (+2 more)

### Community 102 - "challenge-grading.ts"
Cohesion: 0.05
Nodes (23): SoloPracticeDto, SubmitChallengeAnswerDto, MeSkillsController, AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords(), DEBUGGING_TRACEBACK_QUESTIONS (+15 more)

### Community 103 - "useQuizDuel"
Cohesion: 0.36
Nodes (12): DuelArena(), resolveSolo(), soloRound(), useQuizDuel(), answer(), leave(), startOnline(), startSolo() (+4 more)

### Community 104 - "check-competitive-results.mjs"
Cohesion: 0.12
Nodes (14): bankSource, keySandbox, keySource, modal, names, rating, sandbox, solo (+6 more)

### Community 105 - "skills/api.ts"
Cohesion: 0.10
Nodes (16): AdminPage(), run(), saveTech(), instant, Props, Reference, SkillFormModal(), StatsModal() (+8 more)

### Community 106 - "Phase 5 — `profile`"
Cohesion: 0.40
Nodes (5): Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data

### Community 107 - "ProgressAdminController"
Cohesion: 0.05
Nodes (40): ProgressAdminController, AttemptInput, computeLevel(), LevelResult, SkillStatus, statusFromScore(), DIFFICULTY_WEIGHT, MIN_ATTEMPTS (+32 more)

### Community 108 - "Knowledge Management"
Cohesion: 0.18
Nodes (11): API, Configuration and startup (CMD), Coursera CSV import, Database and deployment, Frontend routes, Human-reviewed evaluation, Knowledge Management, Knowledge navigation validation (+3 more)

### Community 109 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, test:auth, test:duel, test:guide (+3 more)

### Community 110 - "check-rankings.mjs"
Cohesion: 0.13
Nodes (10): evaluate(), fs, metrics(), hooks, require, item, query, standing (+2 more)

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

### Community 117 - "AuthUser"
Cohesion: 0.15
Nodes (6): AuthUser, express-serve-static-core, Request, CurrentUser, KnowledgeController, MyKnowledgeController

### Community 118 - "Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)"
Cohesion: 0.13
Nodes (14): 1. Objective, 2. Tech Stack & Commands, 3. Project Structure & Affected Modules, 4. Code Style & Standards, 5. Testing Strategy, 6. Boundaries, 7. Success Criteria, 8. Open Questions & Assumptions (+6 more)

### Community 120 - "Tasks: `role-workflows`"
Cohesion: 0.10
Nodes (20): ✅ Checkpoint I — role-workflows done, ✅ Checkpoint J — account-availability done, ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix, ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations, ✅ Checkpoint M — Recruiter Candidate Invitation Delivery, Phase 12 — Dynamic Scoring Core Cleanup (`scoring`), Phase 13 — Database Median View & Functions (`scoring`), Phase 15 — Verification Checkpoint (Checkpoint K) (+12 more)

### Community 121 - "Battle Code integration"
Cohesion: 0.33
Nodes (5): Battle Code integration, Database and startup, Host authentication and data, Included, Verification

### Community 122 - "BYTE workspace guide"
Cohesion: 0.33
Nodes (5): BYTE workspace guide, Implementation, Opening and replaying, Rendering and accessibility, Verification

### Community 123 - "README.md"
Cohesion: 0.33
Nodes (5): Checks and remaining verification, Features and mapping, Marketplace integration, Source and direction, SQL order and startup

### Community 124 - "Aziz + Syrine integration"
Cohesion: 0.33
Nodes (5): Aziz + Syrine integration, Database setup required, Routes, Run with CMD, Verification

### Community 125 - "Skills and Technology Management"
Cohesion: 0.33
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 127 - "Phase 10 — Demo Account Sign-In & Account Availability Resilience"
Cohesion: 0.40
Nodes (5): Phase 10 — Demo Account Sign-In & Account Availability Resilience, T34: Backend CORS Multi-Origin & Profile Contract Hardening, T35: Demo Auth Metadata & Role Sync, T36: Frontend AccountProvider Resilience & Diagnostic Messaging, T37: Automated Verification & Integration Suite

### Community 128 - "OfflineDashboard"
Cohesion: 0.28
Nodes (6): metadata, OfflinePage(), OfflineDashboard(), Phase 8 — `pwa`, T27: Manifest + icons, T28: Service worker + offline page

### Community 129 - "@nestjs/common"
Cohesion: 0.14
Nodes (13): ATTEMPT_VALIDATED, AttemptValidatedEvent, AttemptValidatedListener, setup(), AuthedRequest, AttemptState, DIFFICULTY_ORDER, SkillProgressService (+5 more)

### Community 130 - "storage-smoke.mjs"
Cohesion: 0.20
Nodes (8): admin, { createClient }, files, options, png, require, users, WebSocket

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

### Community 132 - "Tasks: Dynamic Scoring & WebSocket Chat Fix"
Cohesion: 0.11
Nodes (18): ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix, ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations, ✅ Checkpoint M — Recruiter Candidate Invitation Delivery, Phase 12 — Dynamic Scoring Core Cleanup (`scoring`), Phase 13 — Database Median View & Functions (`scoring`), Phase 15 — Verification Checkpoint (Checkpoint K), Phase 16 — Developer Invitations (`developer-invitations`), Phase 17 — Practice & Solo Duel Scoring (`practice-scoring`) (+10 more)

### Community 133 - "marketplace-concurrent.mjs"
Cohesion: 0.43
Nodes (4): ensureUsers(), psql(), psqlArgs(), walletLockVisible()

### Community 134 - "ProfileProgress"
Cohesion: 0.53
Nodes (5): ProfileProgress(), 1. Admin Role, 2. Recruiter Role, 3. Developer Role, Detailed Specifications by Role

### Community 135 - "rankings.controller.ts"
Cohesion: 0.18
Nodes (10): RankingsModule, Phase 14 — Rankings API & Profile Integration (`scoring`), Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T24: `GET /rankings`, T25: `/rankings` page, T26: Score and tier on `/profile` (+2 more)

### Community 139 - "DevArena UI handoff"
Cohesion: 0.25
Nodes (4): Checks and limits, Completed presentation checklist, DevArena UI handoff, Translation and English-copy file inventory

### Community 140 - "Competitive rankings and rank rewards (T53–T57)"
Cohesion: 0.29
Nodes (6): Competitive rankings and rank rewards (T53–T57), Completion, Contracts, Objective, Rules, Structure, commands and style

### Community 141 - "class-validator"
Cohesion: 0.27
Nodes (4): RequestWithUser, SetRoleDto, class-transformer, class-validator

### Community 142 - "useSkillsAccount"
Cohesion: 0.40
Nodes (4): DiscoverPage(), Technology, instant, useSkillsAccount()

### Community 144 - "useQuizDuel.ts"
Cohesion: 0.30
Nodes (9): soloResult(), DEFAULT_DUEL_QUESTIONS, addResult(), BattleState, calculatePoints(), ROUND_TIME_MS, DuelServerEvent, PlayerRoundResult (+1 more)

### Community 145 - "WorkspaceIcon"
Cohesion: 0.21
Nodes (9): ProfilePage(), instant, RadarChart(), RadarChartProps, SkillCard(), SkillCardProps, icons, skillLevelLabels (+1 more)

### Community 146 - "next"
Cohesion: 0.15
Nodes (9): nextConfig, instant, metadata, ProfileContent(), ProfilePage(), EquippedBadge(), UserProfileData, ProfileHeader() (+1 more)

### Community 147 - "marketplace.controller.ts"
Cohesion: 0.18
Nodes (6): EquipDto, UnequipDto, userLimit, MarketplaceModule, MarketplaceUserThrottlerGuard, @nestjs/throttler

### Community 148 - "Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility"
Cohesion: 0.22
Nodes (8): 1. Overview & Objectives, 2. Dependency Graph & Vertical Slices, 3. Risks & Mitigations, 4. Verification Checkpoint (Checkpoint L), 5. Phase 20: Recruiter Candidate Invitation Delivery (`invitation-delivery`), Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility, Objectives, Vertical Slice & Tasks

### Community 149 - "Data Contract"
Cohesion: 0.40
Nodes (5): Access control (D3, D4), Data Contract, Other schema changes, `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`), Triggers

### Community 151 - "(skills)/duel/page.tsx"
Cohesion: 0.50
Nodes (3): DuelPage(), instant, metadata

### Community 152 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

### Community 153 - "Frontend Contract"
Cohesion: 0.40
Nodes (5): Env, Frontend Contract, Routes, Session, Supabase dashboard configuration (manual, documented in the plan)

### Community 154 - "check-duel.mjs"
Cohesion: 0.33
Nodes (5): question, resolve, result, state, wrong

## Knowledge Gaps
- **41 isolated node(s):** `@supabase/supabase-js`, `reflect-metadata`, `rxjs`, `@eslint/eslintrc`, `@nestjs/cli` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1185 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `next` to `safeNext`, `OfflineDashboard`, `dashboard/page-client.tsx`, `users/page.tsx`, `skills/types.ts`, `useSkillsAccount`, `rankings/page-client.tsx`, `WorkspaceIcon`, `next`, `next`, `useQuizDuel.ts`, `nextjs/package.json`, `DevGuide.tsx`, `KnowledgeDetail.tsx`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `ChallengeModal.tsx`, `apiRequest`, `RecruiterDashboard.tsx`, `skill-associations/page-client.tsx`, `skills/api.ts`, `check-rankings.mjs`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `reflect-metadata`, `rxjs` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeNext` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `duel.gateway.ts`, `backend/package.json`, `app.module.ts`, `duel.types.ts`, `knowledge.controller.ts`, `ListCandidatesQueryDto`, `class-validator`, `SupabaseService`, `guards.ts`, `marketplace.controller.ts`, `TechnologiesService`, `auth.service.ts`, `rankings.service.ts`, `@nestjs/swagger`, `marketplace.service.ts`, `users.service.ts`, `ChallengeSkillsService`, `challenge-grading.ts`, `marketplace.service.spec.ts`, `AuthUser`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06628787878787878 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `safeNext`, `apiRequest`, `RecruiterDashboard.tsx`, `dashboard/page-client.tsx`, `users/page.tsx`, `next`, `skills/api.ts`, `apple-icon.tsx`, `skills/types.ts`, `useSkillsAccount`, `rankings/page-client.tsx`, `WorkspaceIcon`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `KnowledgeDetail.tsx`, `AdminMarketplace.tsx`, `RegisterForm.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._