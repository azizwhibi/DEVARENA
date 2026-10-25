# Graph Report - DEVARENA  (2026-10-25)

## Corpus Check
- 361 files · ~172,166 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 8, (none) 3, .example 3)

## Summary
- 2538 nodes · 5318 edges · 156 communities (127 shown, 29 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 324 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0791ccd5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- messaging.ts
- backend/package.json
- app.module.ts
- duel.types.ts
- knowledge.spec.ts
- SkillsWorkspace.tsx
- MessagingGateway
- next
- devDependencies
- SendMessageDto
- compilerOptions
- createClient
- users.service.ts
- compilerOptions
- createClient
- guards.ts
- AuthUser
- next
- MeProfileController
- nextjs/package.json
- DevGuide.tsx
- apiRequest
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- DuelGateway
- dependencies
- AdminMarketplace.tsx
- RegisterForm.tsx
- verify.mjs
- Spec: `identity` — Accounts, Sessions & Access Control
- storage-smoke.mjs
- InvitationsController
- backend/README.md
- check-admin.mjs
- jest
- seed-roles.mjs
- Email registration setup (T8)
- check-skills.mjs
- apple-icon.tsx
- MeController
- TechnologiesService
- SkillsService
- ListUsersQueryDto
- check-role-login.mjs
- Implementation Plan: DevArena User & Auth initiative
- CategoriesService
- auth.service.spec.ts
- ProgressAdminController
- sendInvitation
- RankingsController
- Identity database: T1–T3a
- nest-cli.json
- @nestjs/swagger
- marketplace.service.ts
- GuideCanvas.tsx
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
- SupabaseService
- nextjs/README.md
- AdminUsersController
- Confirm your DevArena email template
- SupabaseService
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
- duel.gateway.spec.ts
- ref_node_assert
- AdminMarketplaceController
- ChallengeSkillsService
- check-recruiter-candidates.mjs
- Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries
- UpdateProfileDto
- Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels
- recovery.ts
- Tasks: `identity` module
- RecruiterDashboard.tsx
- skill-associations/page-client.tsx
- Detailed Changes
- check-dev-guide.mjs
- MeSkillsController
- .delete
- check-pwa.mjs
- react
- guideMachine.ts
- Spec: `scoring` — Dynamic Scoring & Median Dev Score
- Knowledge Management
- scripts
- check-knowledge.mjs
- GrantCreditsDto
- dependencies
- devDependencies
- DevArena
- marketplace.service.spec.ts
- SkillsDirectoryController
- .list
- Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)
- AnimationKeyForKind
- Tasks: `role-workflows`
- Battle Code integration
- BYTE workspace guide
- README.md
- Aziz + Syrine integration
- Skills and Technology Management
- level.calculator.ts
- Phase 10 — Demo Account Sign-In & Account Availability Resilience
- OfflineDashboard
- Data Contract
- check-register-http.mjs
- Run locally with CMD
- Tasks: Dynamic Scoring & WebSocket Chat Fix
- AssignmentsService
- oauth.ts
- RankingsModule
- UsersService
- RecruiterCandidatesController
- RankingsQueryDto
- DevArena UI handoff
- ListCandidatesQueryDto
- RespondInvitationDto
- AttemptValidatedListener
- check-recruiter-candidates.mjs
- AdminPage
- ProfileProgress
- computeLevel
- Detailed Changes
- Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility
- .inventory
- SetStatusDto
- Automated evidence (2026-10-19)
- Phase 3 — Frontend
- Frontend Contract
- waitForTarget
- Phase 1 — Database

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 78 edges
2. `react` - 69 edges
3. `AuthUser` - 52 edges
4. `next` - 52 edges
5. `apiRequest()` - 44 edges
6. `SupabaseService` - 42 edges
7. `MarketplaceService` - 37 edges
8. `CurrentUser` - 31 edges
9. `SupabaseService` - 30 edges
10. `@nestjs/swagger` - 29 edges

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

## Communities (156 total, 29 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.15
Nodes (20): emailTypes, GET(), LoginContent(), LoginPage(), metadata, LoginForm(), handleDemoLogin(), loginWithCredentials() (+12 more)

### Community 1 - "messaging.ts"
Cohesion: 0.15
Nodes (20): InvitationsContent(), InvitationsPage(), metadata, ChatWorkspace(), ChatWorkspaceProps, InvitationsManager(), handleRealtimeEvent(), loadData() (+12 more)

### Community 2 - "backend/package.json"
Cohesion: 0.06
Nodes (32): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+24 more)

### Community 3 - "app.module.ts"
Cohesion: 0.09
Nodes (22): AuthModule, DuelModule, EquipDto, UnequipDto, userLimit, MarketplaceModule, MarketplaceUserThrottlerGuard, SupabaseModule (+14 more)

### Community 4 - "duel.types.ts"
Cohesion: 0.09
Nodes (33): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, AuthenticatedPlayer, DuelClientEvent (+25 more)

### Community 5 - "knowledge.spec.ts"
Cohesion: 0.12
Nodes (19): RESOURCE_SELECT, usableResource(), DIFFICULTIES, RESOURCE_TYPES, UpdateResourceDto, DIFFICULTY, normalizedImport(), parseCsv() (+11 more)

### Community 6 - "SkillsWorkspace.tsx"
Cohesion: 0.09
Nodes (17): DashboardPage(), instant, DiscoverPage(), Technology, instant, ProfilePage(), instant, HistoryChart() (+9 more)

### Community 7 - "MessagingGateway"
Cohesion: 0.11
Nodes (9): InvitationItem, InboundMessagePayload, MessagingGateway, ConversationItem, ConversationParticipant, isSchemaCacheMissing(), MessageItem, MessagingService (+1 more)

### Community 8 - "next"
Cohesion: 0.09
Nodes (21): metadata, RootLayout(), viewport, AccountAvatar(), Account, AccountContext, AccountProvider(), formatAccountError() (+13 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "createClient"
Cohesion: 0.24
Nodes (11): AvatarUpload(), handleFileChange(), AvatarUploadProps, VALID_EXTENSIONS, useWebSocketChat(), connectSocket(), UseWebSocketChatOptions, getConversationMessages() (+3 more)

### Community 14 - "users.service.ts"
Cohesion: 0.10
Nodes (14): AccountService, setup(), escapeSearchTerm(), SetRoleDto, AdminUserItem, CandidateItem, FALLBACK_TECHNOLOGIES, ListCandidatesResult (+6 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "createClient"
Cohesion: 0.11
Nodes (22): Features and mapping, countries, instant, metadata, ProfileContent(), ProfilePage(), EquippedBadge(), DangerZone() (+14 more)

### Community 17 - "guards.ts"
Cohesion: 0.11
Nodes (16): Rule 5: Database Authoritative Security & Least Privilege Access, express-serve-static-core, Request, AdminGuard, DeveloperGuard, OptionalAuthGuard, RecruiterGuard, UserGuard (+8 more)

### Community 18 - "AuthUser"
Cohesion: 0.16
Nodes (5): AuthUser, CurrentUser, AdminKnowledgeController, MyKnowledgeController, RequestWithUser

### Community 19 - "next"
Cohesion: 0.07
Nodes (24): nextConfig, hooks, AdminUsersContent(), AdminUsersPage(), instant, metadata, MessagesContent(), MessagesPage() (+16 more)

### Community 20 - "MeProfileController"
Cohesion: 0.10
Nodes (9): DeleteMeDto, MeProfileController, Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T13: `GET /me/profile` + `PATCH /me/profile`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data (+1 more)

### Community 21 - "nextjs/package.json"
Cohesion: 0.11
Nodes (16): eslintConfig, engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name (+8 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.14
Nodes (17): ByteFallback(), DevGuide(), find(), update(), GuideCanvas, MascotBoundary, GuideLauncher, routeMatches() (+9 more)

### Community 23 - "apiRequest"
Cohesion: 0.08
Nodes (59): EditKnowledgePage(), instant, instant, NewKnowledgePage(), instant, KnowledgeAdminPage(), instant, ResourcePage() (+51 more)

### Community 24 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 25 - "1. Prime Directives for All Agents"
Cohesion: 0.15
Nodes (12): 1. Prime Directives for All Agents, DevArena: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors (+4 more)

### Community 26 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 27 - "DuelGateway"
Cohesion: 0.08
Nodes (20): DuelGateway, MessagingController, MessagingModule, Boundaries, Commands, Detailed Changes, Objective, Open Questions (+12 more)

### Community 28 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+6 more)

### Community 29 - "AdminMarketplace.tsx"
Cohesion: 0.06
Nodes (61): AdminMarketplacePage(), instant, instant, MarketplacePage(), Account, AdminMarketplace(), archive(), grant() (+53 more)

### Community 30 - "RegisterForm.tsx"
Cohesion: 0.21
Nodes (11): ForgotPasswordPage(), metadata, metadata, RegisterPage(), TickIcon(), ForgotPasswordForm(), submit(), RegisterForm() (+3 more)

### Community 31 - "verify.mjs"
Cohesion: 0.15
Nodes (13): ensureUsers(), psql(), psqlArgs(), walletLockVisible(), before, bucket(), bucketBefore, local (+5 more)

### Community 32 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.18
Nodes (10): `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Objective, Project Structure (new/changed only; reconciled with the real tree before planning), Resolved questions (2026-10-18) (+2 more)

### Community 33 - "storage-smoke.mjs"
Cohesion: 0.10
Nodes (11): originalNavigator, hooks, hooks, admin, { createClient }, files, options, png (+3 more)

### Community 34 - "InvitationsController"
Cohesion: 0.10
Nodes (4): CreateInvitationDto, InvitationsController, InvitationsService, isSchemaCacheMissing()

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
Cohesion: 0.12
Nodes (6): DEMO_USERS, __dirname, env, envPath, supabase, __dirname

### Community 39 - "Email registration setup (T8)"
Cohesion: 0.29
Nodes (6): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration

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
Nodes (5): CreateSkillDto, ListSkillsDto, SkillsController, SkillsService, slugify()

### Community 45 - "ListUsersQueryDto"
Cohesion: 0.13
Nodes (7): ListUsersQueryDto, UsersTable(), Phase 6 — `user-admin`, T18: List users (API + UI), T19: Change role, T20: Suspend / reactivate, T21: Delete user

### Community 46 - "check-role-login.mjs"
Cohesion: 0.24
Nodes (11): __dirname, resolve(), testAccountProviderResilience(), testChallengesAccessProtection(), testHeaderLinks(), testLoginFormPersonaHandling(), testProfileRoleBoundaries(), testProxyNextRedirection() (+3 more)

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "auth.service.spec.ts"
Cohesion: 0.13
Nodes (9): AppModule, assertSafeAuthConfig(), AuthService, setup(), user, ProblemDetailsFilter, respond(), bootstrap() (+1 more)

### Community 50 - "ProgressAdminController"
Cohesion: 0.21
Nodes (4): ProgressAdminController, S2. Rewire `ProgressAdminController` callers, T39: Remove Static Scoring (`applyAttemptResult`) & Rewire Progress Controller, T39: Remove Static Scoring (`applyAttemptResult`) & Rewire Progress Controller

### Community 51 - "sendInvitation"
Cohesion: 0.11
Nodes (21): sendInvitation(), 1. Objective, 2. Tech Stack & Commands, 3. Project Structure, 4. Code Style & Implementation Details, 5. Testing Strategy, 6. Boundaries, 7. Success Criteria (+13 more)

### Community 52 - "RankingsController"
Cohesion: 0.17
Nodes (9): RankingsController, RankingsModule, Phase 14 — Rankings API & Profile Integration (`scoring`), T41: `RankingsModule` & `GET /rankings` API, T42: Integrate `devScore` & `tier` into `UsersService.getProfile()`, Phase 14 — Rankings API & Profile Integration (`scoring`), T24: `GET /rankings`, T41: `RankingsModule` & `GET /rankings` API (+1 more)

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.29
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "@nestjs/swagger"
Cohesion: 0.15
Nodes (9): AuthedRequest, UpdateTechnologyDto, UpdateSkillDto, AuthedRequest, IsIsoCountry(), regionDisplayNames, class-transformer, class-validator (+1 more)

### Community 56 - "marketplace.service.ts"
Cohesion: 0.10
Nodes (14): SaveMarketplaceItemDto, KNOWN, mapMarketplaceError(), RpcFailure, isRecord(), ItemRow, MarketplaceDb, PurchaseRow (+6 more)

### Community 57 - "GuideCanvas.tsx"
Cohesion: 0.17
Nodes (13): ByteCharacter(), Hand(), Joint(), RobotResources, Segment(), gestureDuration, CanvasBoundary, GuideCanvas() (+5 more)

### Community 58 - "MarketplaceService"
Cohesion: 0.22
Nodes (4): isUnknownArray(), MarketplaceService, AdminMarketplaceItem, MarketplaceItem

### Community 59 - "knowledge.controller.ts"
Cohesion: 0.19
Nodes (7): AdminKnowledgeQuery, EventDto, FeedbackDto, ImportDto, KnowledgeQuery, ProgressDto, ResourceDto

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
Cohesion: 0.14
Nodes (3): KnowledgeCatalogueService, KnowledgeImportService, KnowledgeLearningService

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 68 - "SupabaseService"
Cohesion: 0.17
Nodes (9): ATTEMPT_VALIDATED, AttemptValidatedEvent, AuthedRequest, AttemptState, DIFFICULTY_ORDER, SkillProgressService, SupabaseService, @nestjs/common (+1 more)

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "SupabaseService"
Cohesion: 0.14
Nodes (7): MyRank, RankingItem, RankingsResponse, RankingsService, Database, Json, SupabaseService

### Community 73 - "ChallengeModal.tsx"
Cohesion: 0.10
Nodes (22): ArenaPage(), AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords(), ChallengeModal(), ChallengeModalProps, DEBUGGING_TRACEBACK_QUESTIONS (+14 more)

### Community 74 - "CatalogQueryDto"
Cohesion: 0.09
Nodes (3): CatalogController, CatalogService, CatalogQueryDto

### Community 77 - "duel.ts"
Cohesion: 0.06
Nodes (53): question, resolve, result, state, wrong, DuelPage(), instant, metadata (+45 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.16
Nodes (3): MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 82 - "Spec: `developer-invitations` — Recruiter Invitations for Developers"
Cohesion: 0.15
Nodes (12): 1. Navigation Access in `AuthHeader.tsx`, 2. Developer View in `InvitationsManager.tsx`, 3. Dashboard Widget in `dashboard/page-client.tsx`, Boundaries, Commands, Detailed Changes, Objective, Spec: `developer-invitations` — Recruiter Invitations for Developers (+4 more)

### Community 87 - "duel.gateway.spec.ts"
Cohesion: 0.24
Nodes (7): Session, connect(), ids, Message, signedIn(), wait(), DuelServerEvent

### Community 88 - "ref_node_assert"
Cohesion: 0.11
Nodes (14): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+6 more)

### Community 90 - "ChallengeSkillsService"
Cohesion: 0.08
Nodes (4): ChallengeSkillsController, ChallengeSkillsService, ChallengeSkillItemDto, SetChallengeSkillsDto

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.12
Nodes (11): apply, env, fs, input, { parseEnv }, path, assert, fs (+3 more)

### Community 92 - "Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries"
Cohesion: 0.20
Nodes (9): Boundaries, Code Style & Conventions, Commands, Objective, Open Questions for Clarification, Project Structure & Touched Boundaries, Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries, Success Criteria (+1 more)

### Community 95 - "Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels"
Cohesion: 0.20
Nodes (9): 1. Developer Attempt API: `POST /me/challenges/:challengeId/attempt`, 2. Practice Challenges Submission in `ChallengeModal.tsx`, 3. Solo DevBot Battle Duel Submission in `useQuizDuel.ts` & `DuelArena.tsx`, Detailed Changes, Objective, Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels, Success looks like, Testing Strategy (+1 more)

### Community 96 - "recovery.ts"
Cohesion: 0.36
Nodes (6): metadata, ResetPasswordPage(), ResetPasswordForm(), submit(), updatePassword(), UpdatePasswordResult

### Community 97 - "Tasks: `identity` module"
Cohesion: 0.14
Nodes (14): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+6 more)

### Community 98 - "RecruiterDashboard.tsx"
Cohesion: 0.21
Nodes (11): instant, metadata, RecruiterContent(), RecruiterPage(), POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps (+3 more)

### Community 99 - "skill-associations/page-client.tsx"
Cohesion: 0.31
Nodes (5): AssociationsPage(), find(), ChallengeSkills(), initialize(), DeveloperSkills()

### Community 100 - "Detailed Changes"
Cohesion: 0.18
Nodes (10): 1. `useSkillSummary.ts` Median Dev Score Calculation, 2. Developer Dashboard Score Card, 3. Profile Progress Component, 4. Account Menu in `AuthHeader.tsx`, Boundaries, Detailed Changes, Objective, Spec: `user-scores-ui` — Developer Score & Tier Visibility (+2 more)

### Community 101 - "check-dev-guide.mjs"
Cohesion: 0.15
Nodes (8): aborted, controller, element, late, ready(), route(), storage, values

### Community 103 - ".delete"
Cohesion: 0.29
Nodes (5): Success Criteria, Superseded open questions (kept for history), Testing Strategy, Phase 2 — Backend, T5: `AccountService.delete`

### Community 104 - "check-pwa.mjs"
Cohesion: 0.33
Nodes (4): classify(), ctx, manifestSrc, sw

### Community 105 - "react"
Cohesion: 0.07
Nodes (36): Developer, Link, Reference, instant, instant, Challenge, instant, Detail (+28 more)

### Community 106 - "guideMachine.ts"
Cohesion: 0.16
Nodes (12): defaults, GuideEvent, guideReducer(), GuideState, guideStorageKey(), initialState, Preferences, readPreferences() (+4 more)

### Community 107 - "Spec: `scoring` — Dynamic Scoring & Median Dev Score"
Cohesion: 0.20
Nodes (9): Code Style, Commands, Objective, Open Questions, Project Structure (scoring-relevant), Spec: `scoring` — Dynamic Scoring & Median Dev Score, Success looks like, Testing Strategy (+1 more)

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

### Community 118 - "Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)"
Cohesion: 0.15
Nodes (12): 2. Tech Stack & Commands, 3. Project Structure & Affected Modules, 4. Code Style & Standards, 5. Testing Strategy, 6. Boundaries, 7. Success Criteria, 8. Open Questions & Assumptions, Assumptions (+4 more)

### Community 120 - "Tasks: `role-workflows`"
Cohesion: 0.09
Nodes (22): ✅ Checkpoint I — role-workflows done, ✅ Checkpoint J — account-availability done, ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix, ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations, ✅ Checkpoint M — Recruiter Candidate Invitation Delivery, Phase 11 — WebSocket Chat Fix (`ws-chat`), Phase 12 — Dynamic Scoring Core Cleanup (`scoring`), Phase 13 — Database Median View & Functions (`scoring`) (+14 more)

### Community 121 - "Battle Code integration"
Cohesion: 0.33
Nodes (5): Battle Code integration, Database and startup, Host authentication and data, Included, Verification

### Community 122 - "BYTE workspace guide"
Cohesion: 0.33
Nodes (5): BYTE workspace guide, Implementation, Opening and replaying, Rendering and accessibility, Verification

### Community 123 - "README.md"
Cohesion: 0.25
Nodes (4): Checks and remaining verification, Marketplace integration, Source and direction, SQL order and startup

### Community 124 - "Aziz + Syrine integration"
Cohesion: 0.33
Nodes (5): Aziz + Syrine integration, Database setup required, Routes, Run with CMD, Verification

### Community 125 - "Skills and Technology Management"
Cohesion: 0.33
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 126 - "level.calculator.ts"
Cohesion: 0.31
Nodes (7): AttemptInput, LevelResult, SkillStatus, DIFFICULTY_WEIGHT, MIN_ATTEMPTS, SCORING_VERSION, THRESHOLDS

### Community 127 - "Phase 10 — Demo Account Sign-In & Account Availability Resilience"
Cohesion: 0.25
Nodes (8): UserProfileResponse, 1. Objective, Root Causes Identified, Phase 10 — Demo Account Sign-In & Account Availability Resilience, T34: Backend CORS Multi-Origin & Profile Contract Hardening, T35: Demo Auth Metadata & Role Sync, T36: Frontend AccountProvider Resilience & Diagnostic Messaging, T37: Automated Verification & Integration Suite

### Community 128 - "OfflineDashboard"
Cohesion: 0.28
Nodes (6): metadata, OfflinePage(), OfflineDashboard(), Phase 8 — `pwa`, T27: Manifest + icons, T28: Service worker + offline page

### Community 129 - "Data Contract"
Cohesion: 0.40
Nodes (5): Access control (D3, D4), Data Contract, Other schema changes, `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`), Triggers

### Community 130 - "check-register-http.mjs"
Cohesion: 0.40
Nodes (4): checks, href, link, rendered

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

### Community 132 - "Tasks: Dynamic Scoring & WebSocket Chat Fix"
Cohesion: 0.10
Nodes (20): ✅ Checkpoint K — Dynamic Scoring & WebSocket Chat Fix, ✅ Checkpoint L — Score Visibility, Practice Scoring & Developer Invitations, ✅ Checkpoint M — Recruiter Candidate Invitation Delivery, Phase 11 — WebSocket Chat Fix (`ws-chat`), Phase 12 — Dynamic Scoring Core Cleanup (`scoring`), Phase 13 — Database Median View & Functions (`scoring`), Phase 15 — Verification Checkpoint (Checkpoint K), Phase 16 — Developer Invitations (`developer-invitations`) (+12 more)

### Community 133 - "AssignmentsService"
Cohesion: 0.21
Nodes (5): AssignmentsController, MyAssignmentsController, PracticeDirectoryController, AssignmentsService, T30: Backend Role-Based Profile & Guard Isolation

### Community 134 - "oauth.ts"
Cohesion: 0.33
Nodes (7): icons, OAuthButtons(), start(), getOAuthRedirectUrl(), OAUTH_PROVIDERS, OAUTH_SCOPES, signInWithProvider()

### Community 135 - "RankingsModule"
Cohesion: 0.40
Nodes (5): Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T25: `/rankings` page, T26: Score and tier on `/profile`

### Community 139 - "DevArena UI handoff"
Cohesion: 0.33
Nodes (5): Checks and limits, Completed presentation checklist, DevArena UI handoff, Shared implementation, Translation and English-copy file inventory

### Community 142 - "AttemptValidatedListener"
Cohesion: 0.33
Nodes (3): AttemptValidatedListener, Boundaries, Tech Stack

### Community 143 - "check-recruiter-candidates.mjs"
Cohesion: 0.38
Nodes (4): __dirname, resolve(), testInvitationDelivery(), testPrivacyCompliance()

### Community 144 - "AdminPage"
Cohesion: 0.33
Nodes (4): AdminPage(), run(), saveTech(), SkillFormModal()

### Community 145 - "ProfileProgress"
Cohesion: 0.36
Nodes (7): ProfileProgress(), RadarChart(), useSkillSummary(), 1. Admin Role, 2. Recruiter Role, 3. Developer Role, Detailed Specifications by Role

### Community 146 - "computeLevel"
Cohesion: 0.53
Nodes (4): computeLevel(), statusFromScore(), Boundaries, Tech Stack

### Community 147 - "Detailed Changes"
Cohesion: 0.33
Nodes (6): Detailed Changes, S1. Delete `applyAttemptResult()`, S3. `dev_scores` SQL View (Median), S4. `leaderboard()` + `my_rank()` SQL Functions, S5. `GET /rankings` API + Rankings page, S6. `devScore`/`tier` on profile

### Community 148 - "Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility"
Cohesion: 0.22
Nodes (8): 1. Overview & Objectives, 2. Dependency Graph & Vertical Slices, 3. Risks & Mitigations, 4. Verification Checkpoint (Checkpoint L), 5. Phase 20: Recruiter Candidate Invitation Delivery (`invitation-delivery`), Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility, Objectives, Vertical Slice & Tasks

### Community 151 - "Automated evidence (2026-10-19)"
Cohesion: 0.33
Nodes (5): Automated evidence (2026-10-19), DevArena identity checks: T3a–T11 (Phase 4 Cutover), Live checks for the human (pending), Project graph, Spec Success Criteria Status (SPEC-identity.md)

### Community 152 - "Phase 3 — Frontend"
Cohesion: 0.33
Nodes (6): Phase 3 — Frontend, T10: Forgot / reset password, T6: Login slice, T7: `api.ts` Bearer + `useAuth` + logout, T8: `/register` + email confirmation, T9: GitHub + Google OAuth

### Community 153 - "Frontend Contract"
Cohesion: 0.40
Nodes (5): Env, Frontend Contract, Routes, Session, Supabase dashboard configuration (manual, documented in the plan)

### Community 154 - "waitForTarget"
Cohesion: 0.83
Nodes (4): waitForTarget(), abort(), check(), done()

### Community 155 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

## Knowledge Gaps
- **41 isolated node(s):** `@supabase/supabase-js`, `reflect-metadata`, `rxjs`, `@eslint/eslintrc`, `@nestjs/cli` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1129 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `safeNext`, `messaging.ts`, `OfflineDashboard`, `SkillsWorkspace.tsx`, `oauth.ts`, `next`, `createClient`, `createClient`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `GuideCanvas.tsx`, `ChallengeModal.tsx`, `duel.ts`, `recovery.ts`, `RecruiterDashboard.tsx`, `check-knowledge.mjs`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `reflect-metadata`, `rxjs` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `messaging.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `SupabaseService` to `backend/package.json`, `app.module.ts`, `duel.types.ts`, `knowledge.spec.ts`, `MessagingGateway`, `SupabaseService`, `users.service.ts`, `auth.service.spec.ts`, `guards.ts`, `marketplace.service.spec.ts`, `@nestjs/swagger`, `duel.gateway.spec.ts`, `marketplace.service.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `safeNext`, `messaging.ts`, `RecruiterDashboard.tsx`, `recovery.ts`, `SkillsWorkspace.tsx`, `next`, `react`, `apple-icon.tsx`, `createClient`, `ProfileProgress`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `RegisterForm.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08734693877551021 - nodes in this community are weakly interconnected._