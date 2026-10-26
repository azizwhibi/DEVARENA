# Graph Report - DEVARENA  (2026-10-26)

## Corpus Check
- 400 files · ~204,994 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 4, .example 1)

## Summary
- 2860 nodes · 5916 edges · 170 communities (136 shown, 34 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 374 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b9645c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- @nestjs/common
- backend/package.json
- ProgressAdminController
- duel.types.ts
- KnowledgeCatalogueService
- challenge-grading.ts
- GrantCreditsDto
- CreateInvitationDto
- devDependencies
- SendMessageDto
- compilerOptions
- MessagingGateway
- messaging.ts
- compilerOptions
- rankings/page-client.tsx
- guards.ts
- ChallengeSkillsController
- next
- MeProfileController
- nextjs/package.json
- DevGuide.tsx
- apiRequest
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- MessagingModule
- dependencies
- api.http.ts
- RegisterForm.tsx
- verify.mjs
- Spec: `identity` — Accounts, Sessions & Access Control
- ref_node_assert
- AdminMarketplace.tsx
- backend/README.md
- check-admin.mjs
- jest
- DuelRoomService
- AdminPage
- check-recruiter-candidates.mjs
- apple-icon.tsx
- MeController
- TechnologiesService
- SkillsService
- check-practice-loading.mjs
- check-role-login.mjs
- Implementation Plan: DevArena User & Auth initiative
- CategoriesService
- MarketplaceApp.tsx
- InvitationsController
- RankRewardListener
- rankings.service.ts
- Identity database: T1–T3a
- nest-cli.json
- Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels
- marketplace.service.ts
- ProfileProgress
- MarketplaceService
- knowledge.controller.ts
- ChallengeSkillItemDto
- Q: Which existing files should the login slice reuse?
- Q: How does the completed T7 header obtain its account data?
- ItemDialog
- Identity precheck results — 2026-10-18
- MarketplaceController
- AuthUser
- tsconfig.build.json
- check-practice-history.mjs
- nextjs/README.md
- ListUsersQueryDto
- Confirm your DevArena email template
- ref_node_fs
- SkillsWorkspace.tsx
- CatalogQueryDto
- sw.js
- (auth)/layout.tsx
- duel.ts
- SkillInsightsService
- engines
- nextjs/AGENTS.md
- Browser window with three toolbar controls
- KnowledgeRecommendationsService
- Document file icon with folded corner and text lines
- Globe icon
- Next.js wordmark
- Vercel white triangular logo
- MessagingService
- duel-integration.cjs
- AdminMarketplaceController
- AnimationKeyForKind
- check-recruiter-candidates.mjs
- check-register-http.mjs
- AssignmentsService
- users.service.ts
- practice-questions.ts
- createClient
- Tasks: `identity` module
- check-recovery-runtime.cjs
- AssociationsPage
- Detailed Changes
- UpdateProfileDto
- MeSkillsController
- useQuizDuel
- check-competitive-results.mjs
- react
- MyAssignmentsController
- Spec: `scoring` — Dynamic Scoring & Median Dev Score
- Knowledge Management
- scripts
- check-rankings.mjs
- oauth.ts
- dependencies
- devDependencies
- DevArena
- marketplace.service.spec.ts
- SkillsDirectoryController
- ChallengeSkillsService
- Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)
- ResetPasswordForm.tsx
- Tasks: `role-workflows`
- README.md
- BYTE workspace guide
- Marketplace integration
- Aziz + Syrine integration
- Skills and Technology Management
- RecruiterDashboard.tsx
- .getProfile
- app/layout.tsx
- KnowledgeEditor
- SubmitChallengeAnswerDto
- Run locally with CMD
- Tasks: Dynamic Scoring & WebSocket Chat Fix
- .adminItem
- Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries
- app.module.ts
- MyStanding
- ListCandidatesQueryDto
- RankingsQueryDto
- nextjs/eslint.config.mjs
- Competitive rankings and rank rewards (T53–T57)
- SetChallengeSkillsDto
- @playwright/test
- MarketplaceApp
- useQuizDuel.ts
- ProfileForm.tsx
- auth.service.spec.ts
- Recovery phase — practice delivery and duel ranking (Checkpoint O)
- RespondInvitationDto
- DuelArena.tsx
- Phase 1 — Database
- check-duel.mjs
- knowledge-recommendations.service.ts
- SaveMarketplaceItemDto
- SupabaseService
- Spec: duel-ranking-recovery
- Active extension: challenge delivery and duel ranking recovery
- Spec: practice-delivery
- OfflineDashboard
- Development duel-ranking repair package (T67)
- EquippedBadge
- SoloPracticeDto
- computeLevel
- Challenge and duel recovery readiness (T62)
- Review receipt: duel profile scores and practice loading (T58–T59)
- Detailed Changes
- Active Phase — Battle Score-Margin Ranking Adjustment & Persistence (Checkpoint P)
- Phase 7 — `rankings`
- Capability map: challenge delivery and duel ranking recovery

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

## Communities (170 total, 34 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.16
Nodes (17): emailTypes, GET(), LoginContent(), LoginPage(), metadata, LoginForm(), handleDemoLogin(), loginWithCredentials() (+9 more)

### Community 1 - "@nestjs/common"
Cohesion: 0.11
Nodes (15): AssignmentsController, AuthRequest, UpdateTechnologyDto, ATTEMPT_VALIDATED, AttemptValidatedEvent, AttemptValidatedListener, setup(), AuthedRequest (+7 more)

### Community 2 - "backend/package.json"
Cohesion: 0.06
Nodes (32): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+24 more)

### Community 3 - "ProgressAdminController"
Cohesion: 0.19
Nodes (4): ProgressAdminController, S2. Rewire `ProgressAdminController` callers, T39: Remove Static Scoring (`applyAttemptResult`) & Rewire Progress Controller, T39: Remove Static Scoring (`applyAttemptResult`) & Rewire Progress Controller

### Community 4 - "duel.types.ts"
Cohesion: 0.09
Nodes (32): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, AuthenticatedPlayer, DuelClientEvent (+24 more)

### Community 5 - "KnowledgeCatalogueService"
Cohesion: 0.12
Nodes (6): KnowledgeCatalogueService, KnowledgeImportService, normalizedImport(), parseCsv(), KnowledgeLearningService, KnowledgeStore

### Community 6 - "challenge-grading.ts"
Cohesion: 0.17
Nodes (18): backend, { createClient }, { existsSync }, { getChallengeBankName, getChallengeQuestionBank }, main(), path, bankFromKeywords(), CATEGORY_BANKS (+10 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "MessagingGateway"
Cohesion: 0.29
Nodes (3): MessagingGateway, Phase 11 — WebSocket Chat Fix (`ws-chat`), T38: Wire `MessagingModule` in `AppModule` & Add Gateway Smoke Tests

### Community 14 - "messaging.ts"
Cohesion: 0.08
Nodes (35): ChatWorkspace(), ChatWorkspaceProps, InvitationsManager(), handleRealtimeEvent(), loadData(), InvitationsManagerProps, useWebSocketChat(), connectSocket() (+27 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "rankings/page-client.tsx"
Cohesion: 0.10
Nodes (22): 2.1 Graphify Nodes & Edges Traced, Home(), steps, countries, RankingsPage(), scopes, metadata, Page() (+14 more)

### Community 17 - "guards.ts"
Cohesion: 0.08
Nodes (22): Rule 5: Database Authoritative Security & Least Privilege Access, express-serve-static-core, Request, AdminGuard, DeveloperGuard, OptionalAuthGuard, RecruiterGuard, UserGuard (+14 more)

### Community 19 - "next"
Cohesion: 0.08
Nodes (28): nextConfig, hooks, AdminUsersContent(), AdminUsersPage(), instant, metadata, InvitationsContent(), InvitationsPage() (+20 more)

### Community 20 - "MeProfileController"
Cohesion: 0.12
Nodes (8): DeleteMeDto, MeProfileController, Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data, T17: Self-service account deletion

### Community 21 - "nextjs/package.json"
Cohesion: 0.12
Nodes (15): engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name, private (+7 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.05
Nodes (53): aborted, controller, element, late, ready(), route(), storage, values (+45 more)

### Community 23 - "apiRequest"
Cohesion: 0.10
Nodes (54): instant, KnowledgeAdminPage(), instant, ResourcePage(), instant, KnowledgePage(), instant, LearningProgressPage() (+46 more)

### Community 24 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 25 - "1. Prime Directives for All Agents"
Cohesion: 0.15
Nodes (12): 1. Prime Directives for All Agents, DevArena: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors (+4 more)

### Community 26 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 27 - "MessagingModule"
Cohesion: 0.11
Nodes (19): MessagingModule, Boundaries, Commands, Detailed Changes, Objective, Open Questions, Root cause, Spec: `ws-chat` — WebSocket Chat Fix (Recruiter ↔ Developer) (+11 more)

### Community 28 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+6 more)

### Community 29 - "api.http.ts"
Cohesion: 0.18
Nodes (14): call(), isKnownCode(), KNOWN, marketplaceErrorFrom(), AdminMarketplaceItem, ChallengeOption, GrantCreditsInput, InventoryItem (+6 more)

### Community 30 - "RegisterForm.tsx"
Cohesion: 0.21
Nodes (11): ForgotPasswordPage(), metadata, metadata, RegisterPage(), TickIcon(), ForgotPasswordForm(), submit(), RegisterForm() (+3 more)

### Community 31 - "verify.mjs"
Cohesion: 0.15
Nodes (13): ensureUsers(), psql(), psqlArgs(), walletLockVisible(), before, bucket(), bucketBefore, local (+5 more)

### Community 32 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.09
Nodes (22): Access control (D3, D4), `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Data Contract, Env (+14 more)

### Community 33 - "ref_node_assert"
Cohesion: 0.08
Nodes (15): destination, originalNavigator, hooks, hooks, hooks, failures, hooks, admin (+7 more)

### Community 34 - "AdminMarketplace.tsx"
Cohesion: 0.12
Nodes (16): AdminMarketplacePage(), instant, Account, AdminMarketplace(), archive(), grant(), save(), emptyItem() (+8 more)

### Community 35 - "backend/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 36 - "check-admin.mjs"
Cohesion: 0.20
Nodes (4): url1, url2, validRoles, validStatuses

### Community 37 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 38 - "DuelRoomService"
Cohesion: 0.15
Nodes (5): safeSend(), DuelRoomService, DuelRoomSession, Question, WaitingPlayer

### Community 39 - "AdminPage"
Cohesion: 0.25
Nodes (5): AdminPage(), run(), saveTech(), SkillFormModal(), StatsModal()

### Community 40 - "check-recruiter-candidates.mjs"
Cohesion: 0.07
Nodes (15): DEMO_USERS, __dirname, env, envPath, supabase, assert, fs, path (+7 more)

### Community 41 - "apple-icon.tsx"
Cohesion: 0.33
Nodes (6): AppleIcon(), contentType, size, GET(), sizes, monogram()

### Community 42 - "MeController"
Cohesion: 0.22
Nodes (3): MeController, event(), Success Criteria

### Community 43 - "TechnologiesService"
Cohesion: 0.08
Nodes (4): CreateTechnologyDto, slugify(), TechnologiesController, TechnologiesService

### Community 44 - "SkillsService"
Cohesion: 0.07
Nodes (6): CreateSkillDto, ListSkillsDto, UpdateSkillDto, SkillsController, SkillsService, slugify()

### Community 45 - "check-practice-loading.mjs"
Cohesion: 0.12
Nodes (22): bank(), button(), changing, closed, exhausted, failed, newPrompt, next (+14 more)

### Community 46 - "check-role-login.mjs"
Cohesion: 0.24
Nodes (11): __dirname, resolve(), testAccountProviderResilience(), testChallengesAccessProtection(), testHeaderLinks(), testLoginFormPersonaHandling(), testProfileRoleBoundaries(), testProxyNextRedirection() (+3 more)

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "MarketplaceApp.tsx"
Cohesion: 0.22
Nodes (11): MOTION, kindLabel, filters, kindLabel, describeOffer(), marketplaceHttp, marketplaceApi, marketplaceMessage() (+3 more)

### Community 50 - "InvitationsController"
Cohesion: 0.15
Nodes (4): InvitationsController, InvitationsService, isSchemaCacheMissing(), 2. Tech Stack & Commands

### Community 52 - "rankings.service.ts"
Cohesion: 0.13
Nodes (11): RankingsController, RankingsModule, MyRank, RankingItem, RankingRow, RankingScore, RankingsResponse, RankingsService (+3 more)

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.33
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels"
Cohesion: 0.18
Nodes (10): 1. Developer Attempt API: `POST /me/challenges/:challengeId/attempt`, 2. Practice Challenges Submission in `ChallengeModal.tsx`, 3. Solo DevBot Battle Duel Submission in `useQuizDuel.ts` & `DuelArena.tsx`, Boundaries, Detailed Changes, Objective, Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels, Success looks like (+2 more)

### Community 56 - "marketplace.service.ts"
Cohesion: 0.22
Nodes (12): KNOWN, mapMarketplaceError(), RpcFailure, ItemRow, MarketplaceDb, PurchaseRow, Query, ChallengeOption (+4 more)

### Community 57 - "ProfileProgress"
Cohesion: 0.53
Nodes (5): ProfileProgress(), 1. Admin Role, 2. Recruiter Role, 3. Developer Role, Detailed Specifications by Role

### Community 58 - "MarketplaceService"
Cohesion: 0.21
Nodes (5): isRecord(), isUnknownArray(), MarketplaceService, Inventory, MarketplaceItem

### Community 59 - "knowledge.controller.ts"
Cohesion: 0.16
Nodes (13): RESOURCE_SELECT, usableResource(), AdminKnowledgeQuery, DIFFICULTIES, EventDto, FeedbackDto, ImportDto, KnowledgeQuery (+5 more)

### Community 61 - "Q: Which existing files should the login slice reuse?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which existing files should the login slice reuse?, Source Nodes

### Community 62 - "Q: How does the completed T7 header obtain its account data?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How does the completed T7 header obtain its account data?, Source Nodes

### Community 63 - "ItemDialog"
Cohesion: 0.39
Nodes (7): ItemDialog(), buy(), equip(), readHint(), messageOf(), subscribe(), useMarketplaceOnline()

### Community 64 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 66 - "AuthUser"
Cohesion: 0.15
Nodes (6): AuthUser, CurrentUser, AdminKnowledgeController, KnowledgeController, MyKnowledgeController, RequestWithUser

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 68 - "check-practice-history.mjs"
Cohesion: 0.12
Nodes (17): choose(), denied, deniedFirst, first, freshModule, malformed, previousHistory, prompts (+9 more)

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 70 - "ListUsersQueryDto"
Cohesion: 0.06
Nodes (9): AdminUsersController, ListUsersQueryDto, SetStatusDto, UsersTable(), Phase 6 — `user-admin`, T18: List users (API + UI), T19: Change role, T20: Suspend / reactivate (+1 more)

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "ref_node_fs"
Cohesion: 0.11
Nodes (14): evaluate(), fs, metrics(), disconnected, oldTimer, saved, stale, timeout (+6 more)

### Community 73 - "SkillsWorkspace.tsx"
Cohesion: 0.08
Nodes (29): Checks and limits, Completed presentation checklist, DevArena UI handoff, Shared implementation, Translation and English-copy file inventory, ArenaPage(), Challenge, instant (+21 more)

### Community 74 - "CatalogQueryDto"
Cohesion: 0.09
Nodes (3): CatalogController, CatalogService, CatalogQueryDto

### Community 77 - "duel.ts"
Cohesion: 0.08
Nodes (24): DuelClientEvent, DuelClientEventType, DuelDriverType, DuelErrorPayload, DuelJoinPayload, DuelMatchAcceptedUpdatePayload, DuelMatchAcceptPayload, DuelMatchCancelledPayload (+16 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.16
Nodes (3): MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 82 - "KnowledgeRecommendationsService"
Cohesion: 0.29
Nodes (3): KnowledgeRecommendationsService, rankResources(), scenario()

### Community 87 - "MessagingService"
Cohesion: 0.11
Nodes (3): MessagingController, isSchemaCacheMissing(), MessagingService

### Community 88 - "duel-integration.cjs"
Cohesion: 0.13
Nodes (12): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+4 more)

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.22
Nodes (6): apply, env, fs, input, { parseEnv }, path

### Community 92 - "check-register-http.mjs"
Cohesion: 0.40
Nodes (4): checks, href, link, rendered

### Community 94 - "users.service.ts"
Cohesion: 0.06
Nodes (29): AccountService, setup(), Json, MockAuth, MockAuthAdmin, MockStorage, MockSupabaseClient, MockSupabaseService (+21 more)

### Community 95 - "practice-questions.ts"
Cohesion: 0.11
Nodes (17): AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, DEBUGGING_TRACEBACK_QUESTIONS, DOCKER_QUESTIONS, FLUTTER_QUESTIONS, NESTJS_QUESTIONS, NODEJS_QUESTIONS (+9 more)

### Community 96 - "createClient"
Cohesion: 0.15
Nodes (13): AdminUser, ListUsersResponse, UsersTableProps, AvatarUpload(), handleFileChange(), AvatarUploadProps, VALID_EXTENSIONS, DangerZone() (+5 more)

### Community 97 - "Tasks: `identity` module"
Cohesion: 0.11
Nodes (18): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+10 more)

### Community 98 - "check-recovery-runtime.cjs"
Cohesion: 0.15
Nodes (15): admin, api(), backend, { createClient }, { DEFAULT_DUEL_QUESTIONS }, fixtures, { getChallengeBankName }, main() (+7 more)

### Community 99 - "AssociationsPage"
Cohesion: 0.31
Nodes (5): AssociationsPage(), find(), ChallengeSkills(), initialize(), DeveloperSkills()

### Community 100 - "Detailed Changes"
Cohesion: 0.18
Nodes (10): 1. `useSkillSummary.ts` Median Dev Score Calculation, 2. Developer Dashboard Score Card, 3. Profile Progress Component, 4. Account Menu in `AuthHeader.tsx`, Boundaries, Detailed Changes, Objective, Spec: `user-scores-ui` — Developer Score & Tier Visibility (+2 more)

### Community 103 - "useQuizDuel"
Cohesion: 0.36
Nodes (12): DuelArena(), resolveSolo(), soloRound(), useQuizDuel(), answer(), leave(), startOnline(), startSolo() (+4 more)

### Community 104 - "check-competitive-results.mjs"
Cohesion: 0.08
Nodes (22): accountBrowser, accountEffects, accountModule, arena, battle, browser, cleanupAccount, contentSandbox (+14 more)

### Community 105 - "react"
Cohesion: 0.06
Nodes (47): Developer, Link, Reference, instant, instant, DashboardPage(), instant, DiscoverPage() (+39 more)

### Community 106 - "MyAssignmentsController"
Cohesion: 0.33
Nodes (3): MyAssignmentsController, PracticeDirectoryController, T30: Backend Role-Based Profile & Guard Isolation

### Community 107 - "Spec: `scoring` — Dynamic Scoring & Median Dev Score"
Cohesion: 0.20
Nodes (9): Code Style, Commands, Objective, Open Questions, Project Structure (scoring-relevant), Spec: `scoring` — Dynamic Scoring & Median Dev Score, Success looks like, Testing Strategy (+1 more)

### Community 108 - "Knowledge Management"
Cohesion: 0.18
Nodes (11): API, Configuration and startup (CMD), Coursera CSV import, Database and deployment, Frontend routes, Human-reviewed evaluation, Knowledge Management, Knowledge navigation validation (+3 more)

### Community 109 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, start, test:auth, test:duel, test:e2e (+5 more)

### Community 110 - "check-rankings.mjs"
Cohesion: 0.20
Nodes (5): item, query, standing, table, react-dom

### Community 111 - "oauth.ts"
Cohesion: 0.11
Nodes (18): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration, Automated evidence (2026-10-19), DevArena identity checks: T3a–T11 (Phase 4 Cutover) (+10 more)

### Community 112 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, lucide-react, next, react, react-dom, @react-three/drei, @react-three/fiber, @supabase/ssr (+2 more)

### Community 113 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react (+3 more)

### Community 114 - "DevArena"
Cohesion: 0.22
Nodes (9): Battle Code setup, DevArena, Further documentation, Modules, Repository structure, Routes, Stack, Troubleshooting (+1 more)

### Community 115 - "marketplace.service.spec.ts"
Cohesion: 0.29
Nodes (7): Failure, itemRow, push(), Query, QueryResult, selects, tables

### Community 118 - "Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)"
Cohesion: 0.15
Nodes (12): 2. Tech Stack & Commands, 3. Project Structure & Affected Modules, 4. Code Style & Standards, 5. Testing Strategy, 6. Boundaries, 7. Success Criteria, 8. Open Questions & Assumptions, Assumptions (+4 more)

### Community 119 - "ResetPasswordForm.tsx"
Cohesion: 0.21
Nodes (11): metadata, ResetPasswordPage(), ResetPasswordForm(), submit(), updatePassword(), Phase 3 — Frontend, T10: Forgot / reset password, T6: Login slice (+3 more)

### Community 120 - "Tasks: `role-workflows`"
Cohesion: 0.10
Nodes (20): ✅ Checkpoint I — role-workflows done, ✅ Checkpoint J — account-availability done, ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix, ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations, ✅ Checkpoint M — Recruiter Candidate Invitation Delivery, Phase 12 — Dynamic Scoring Core Cleanup (`scoring`), Phase 13 — Database Median View & Functions (`scoring`), Phase 15 — Verification Checkpoint (Checkpoint K) (+12 more)

### Community 121 - "README.md"
Cohesion: 0.25
Nodes (4): Battle Code integration, Database and startup, Included, Verification

### Community 122 - "BYTE workspace guide"
Cohesion: 0.33
Nodes (5): BYTE workspace guide, Implementation, Opening and replaying, Rendering and accessibility, Verification

### Community 123 - "Marketplace integration"
Cohesion: 0.40
Nodes (4): Checks and remaining verification, Marketplace integration, Source and direction, SQL order and startup

### Community 124 - "Aziz + Syrine integration"
Cohesion: 0.33
Nodes (5): Aziz + Syrine integration, Database setup required, Routes, Run with CMD, Verification

### Community 125 - "Skills and Technology Management"
Cohesion: 0.29
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 126 - "RecruiterDashboard.tsx"
Cohesion: 0.24
Nodes (9): RecruiterContent(), RecruiterPage(), POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps, buildCandidatesQuery(), CandidateItem (+1 more)

### Community 127 - ".getProfile"
Cohesion: 0.14
Nodes (12): UserProfileResponse, 1. Objective, Root Causes Identified, Phase 14 — Rankings API & Profile Integration (`scoring`), T42: Integrate `devScore` & `tier` into `UsersService.getProfile()`, Phase 10 — Demo Account Sign-In & Account Availability Resilience, Phase 14 — Rankings API & Profile Integration (`scoring`), T34: Backend CORS Multi-Origin & Profile Contract Hardening (+4 more)

### Community 128 - "app/layout.tsx"
Cohesion: 0.14
Nodes (10): metadata, RootLayout(), viewport, AuthHeader(), dismissed(), InstallEvent, InstallPrompt(), OfflineBanner() (+2 more)

### Community 129 - "KnowledgeEditor"
Cohesion: 0.38
Nodes (5): EditKnowledgePage(), instant, instant, NewKnowledgePage(), KnowledgeEditor()

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

### Community 132 - "Tasks: Dynamic Scoring & WebSocket Chat Fix"
Cohesion: 0.06
Nodes (38): sendInvitation(), 1. Objective, 3. Project Structure, 4. Code Style & Implementation Details, 5. Testing Strategy, 6. Boundaries, 7. Success Criteria, Client Action in `RecruiterDashboard.tsx` (+30 more)

### Community 134 - "Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries"
Cohesion: 0.20
Nodes (9): Boundaries, Code Style & Conventions, Commands, Objective, Open Questions for Clarification, Project Structure & Touched Boundaries, Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries, Success Criteria (+1 more)

### Community 135 - "app.module.ts"
Cohesion: 0.12
Nodes (12): AuthModule, DuelModule, KnowledgeModule, EquipDto, UnequipDto, userLimit, MarketplaceModule, MarketplaceUserThrottlerGuard (+4 more)

### Community 136 - "MyStanding"
Cohesion: 0.07
Nodes (28): 1. Executive Summary, 2.2 Files Changed, 2.3 Commands Run & Status, 2.4 Ponytail Discipline Check, 2.5 Security & Privacy Floors, 2. Review Receipt Dimensions (Rule 10), 3. Exit Criteria & Checkpoint Status, Verification & Review Receipt: Battle Score-Margin Ranking Adjustment & Persistence (`battle-margin-ranking`) (+20 more)

### Community 138 - "RankingsQueryDto"
Cohesion: 0.11
Nodes (3): RankingsQueryDto, isSchemaCacheMissing(), Architecture & Concrete Boundaries

### Community 140 - "Competitive rankings and rank rewards (T53–T57)"
Cohesion: 0.29
Nodes (6): Competitive rankings and rank rewards (T53–T57), Completion, Contracts, Objective, Rules, Structure, commands and style

### Community 143 - "MarketplaceApp"
Cohesion: 0.24
Nodes (10): instant, MarketplacePage(), EquippedSlot(), MarketplaceApp(), applyInventory(), remove(), wear(), messageOf() (+2 more)

### Community 144 - "useQuizDuel.ts"
Cohesion: 0.26
Nodes (10): soloResult(), DEFAULT_DUEL_QUESTIONS, BattleState, calculatePoints(), ROUND_TIME_MS, DuelRatingUpdatePayload, DuelServerEvent, PlayerRoundResult (+2 more)

### Community 146 - "ProfileForm.tsx"
Cohesion: 0.16
Nodes (16): countries, instant, metadata, ProfileContent(), ProfilePage(), DEFAULT_TECHNOLOGIES, ProfileFormProps, TechnologyOption (+8 more)

### Community 147 - "auth.service.spec.ts"
Cohesion: 0.10
Nodes (12): AppModule, assertSafeAuthConfig(), AuthService, setup(), user, ProblemDetailsFilter, respond(), DuelGateway (+4 more)

### Community 149 - "Recovery phase — practice delivery and duel ranking (Checkpoint O)"
Cohesion: 0.15
Nodes (13): Checkpoint O, Recovery phase — practice delivery and duel ranking (Checkpoint O), T62: Record live catalog and schema readiness, T63: Serve authoritative practice content, T64: Cover the current challenge subjects, T65: Render only loaded practice questions, T66: Rotate practice questions across reopening, T67: Prepare exact development schema repair (+5 more)

### Community 151 - "DuelArena.tsx"
Cohesion: 0.33
Nodes (3): DuelPage(), instant, metadata

### Community 152 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

### Community 154 - "check-duel.mjs"
Cohesion: 0.29
Nodes (6): question, resolve, result, soloState, state, wrong

### Community 155 - "knowledge-recommendations.service.ts"
Cohesion: 0.24
Nodes (9): Candidate, Measurement, AttemptInput, LevelResult, SkillStatus, DIFFICULTY_WEIGHT, MIN_ATTEMPTS, SCORING_VERSION (+1 more)

### Community 157 - "SupabaseService"
Cohesion: 0.08
Nodes (23): Session, connect(), ids, Message, signedIn(), wait(), DuelMatchmakingService, fakeStore() (+15 more)

### Community 158 - "Spec: duel-ranking-recovery"
Cohesion: 0.18
Nodes (10): Behavior and interface requirements, Boundaries, Code style, Commands, Objective and assumptions, Open questions and verification limitations, Spec: duel-ranking-recovery, Specification review receipt (+2 more)

### Community 159 - "Active extension: challenge delivery and duel ranking recovery"
Cohesion: 0.11
Nodes (17): 1. Overview & Objectives, 2. Dependency Graph & Vertical Slices, 3. Risks & Mitigations, 4. Verification Checkpoint (Checkpoint L), 5. Phase 20: Recruiter Candidate Invitation Delivery (`invitation-delivery`), Active extension: Battle Score-Margin Ranking Adjustment & Persistence (`battle-margin-ranking`), Active extension: challenge delivery and duel ranking recovery, Architecture and concrete boundaries (+9 more)

### Community 160 - "Spec: practice-delivery"
Cohesion: 0.20
Nodes (9): Behavior and interface requirements, Boundaries, Code style, Commands, Objective and assumptions, Open questions and verification limitations, Spec: practice-delivery, Tech stack and project structure (+1 more)

### Community 161 - "OfflineDashboard"
Cohesion: 0.28
Nodes (6): metadata, OfflinePage(), OfflineDashboard(), Phase 8 — `pwa`, T27: Manifest + icons, T28: Service worker + offline page

### Community 162 - "Development duel-ranking repair package (T67)"
Cohesion: 0.25
Nodes (7): Development duel-ranking repair package (T67), Evidence and access, Exact proposed repair, Local verification and results, Required hosted preflight, Review receipt, Rollback and post-execution proof

### Community 163 - "EquippedBadge"
Cohesion: 0.33
Nodes (6): Features and mapping, AccountEquippedBadge(), EquippedBadge(), EquippedMotion(), useReducedMotion(), T32: Profile & Settings Role Isolation

### Community 165 - "computeLevel"
Cohesion: 0.53
Nodes (4): computeLevel(), statusFromScore(), Boundaries, Tech Stack

### Community 166 - "Challenge and duel recovery readiness (T62)"
Cohesion: 0.33
Nodes (5): Access, identity and runtime gates, Challenge and duel recovery readiness (T62), Initial schema/API observations, Reproducible catalog audit, Review receipt

### Community 167 - "Review receipt: duel profile scores and practice loading (T58–T59)"
Cohesion: 0.33
Nodes (5): Commands and results, Files changed, Ponytail check and open risks, Result, Review receipt: duel profile scores and practice loading (T58–T59)

### Community 170 - "Detailed Changes"
Cohesion: 0.33
Nodes (6): Detailed Changes, S1. Delete `applyAttemptResult()`, S3. `dev_scores` SQL View (Median), S4. `leaderboard()` + `my_rank()` SQL Functions, S5. `GET /rankings` API + Rankings page, S6. `devScore`/`tier` on profile

### Community 171 - "Active Phase — Battle Score-Margin Ranking Adjustment & Persistence (Checkpoint P)"
Cohesion: 0.25
Nodes (8): rating(), Active Phase — Battle Score-Margin Ranking Adjustment & Persistence (Checkpoint P), Checkpoint P, T73: Database SQL Migration & RPC for Battle Score Margin Calculation, T74: Backend Rating Persistence & Payload Integration in `DuelRoomService`, T75: Frontend Duel Result Modal with Margin Bonus & Real-Time Rating Display, T76: Frontend Rankings Board & MyStanding Visibility Verification, T77: Full Regression Suite, Typechecks, Graphify Sync & Checkpoint P Review

### Community 175 - "Phase 7 — `rankings`"
Cohesion: 0.40
Nodes (5): Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T25: `/rankings` page, T26: Score and tier on `/profile`

### Community 176 - "Capability map: challenge delivery and duel ranking recovery"
Cohesion: 0.50
Nodes (3): Capability map: challenge delivery and duel ranking recovery, Evidence collected before proposing boundaries, Proposed acceptance direction for the module specifications

## Knowledge Gaps
- **866 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+861 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1316 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `backend/package.json`, `duel.types.ts`, `challenge-grading.ts`, `app.module.ts`, `knowledge-recommendations.service.ts`, `SkillsService`, `guards.ts`, `auth.service.spec.ts`, `marketplace.service.spec.ts`, `rankings.service.ts`, `marketplace.service.ts`, `knowledge.controller.ts`, `SupabaseService`, `users.service.ts`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `safeNext`, `app/layout.tsx`, `messaging.ts`, `rankings/page-client.tsx`, `useQuizDuel.ts`, `ProfileForm.tsx`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `DuelArena.tsx`, `RegisterForm.tsx`, `OfflineDashboard`, `AdminMarketplace.tsx`, `MarketplaceApp.tsx`, `ItemDialog`, `ref_node_fs`, `SkillsWorkspace.tsx`, `createClient`, `check-rankings.mjs`, `oauth.ts`, `ResetPasswordForm.tsx`, `RecruiterDashboard.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `safeNext`, `app/layout.tsx`, `messaging.ts`, `MarketplaceApp`, `rankings/page-client.tsx`, `ProfileForm.tsx`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `DuelArena.tsx`, `RegisterForm.tsx`, `AdminMarketplace.tsx`, `apple-icon.tsx`, `MarketplaceApp.tsx`, `SkillsWorkspace.tsx`, `createClient`, `react`, `ResetPasswordForm.tsx`, `RecruiterDashboard.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _866 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `@nestjs/common` be split into smaller, more focused modules?**
  _Cohesion score 0.11372549019607843 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Should `duel.types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08858858858858859 - nodes in this community are weakly interconnected._