# Graph Report - DEVARENA  (2026-10-24)

## Corpus Check
- 345 files · ~158,364 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 8, (none) 3, .example 3)

## Summary
- 2349 nodes · 4996 edges · 132 communities (104 shown, 28 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 241 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `084987d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- ListUsersQueryDto
- backend/package.json
- auth.module.ts
- duel.types.ts
- apiRequest
- InvitationsService
- SupabaseService
- SkillsWorkspace.tsx
- devDependencies
- MessagingController
- compilerOptions
- messaging.ts
- ListCandidatesQueryDto
- compilerOptions
- createClient
- guards.ts
- CurrentUser
- next
- MeProfileController
- nextjs/package.json
- DevGuide.tsx
- KnowledgeDetail.tsx
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- DuelRoomService
- dependencies
- AdminMarketplace.tsx
- RegisterForm.tsx
- verify.mjs
- Tasks: `identity` module
- storage-smoke.mjs
- MarketplaceApp.tsx
- backend/README.md
- check-admin.mjs
- jest
- seed-roles.mjs
- Email registration setup (T8)
- ref_node_module
- apple-icon.tsx
- MeController
- TechnologiesService
- SkillsService
- AdminUsersController
- check-role-login.mjs
- Implementation Plan: DevArena User & Auth initiative
- CategoriesService
- ItemDialog.tsx
- ProgressAdminController
- MessagingService
- useAuth
- Identity database: T1–T3a
- nest-cli.json
- @nestjs/swagger
- marketplace.service.ts
- api.http.ts
- MarketplaceService
- UsersService
- app/page.tsx
- Q: Which existing files should the login slice reuse?
- Q: How does the completed T7 header obtain its account data?
- resolveRoleDestination
- Identity precheck results — 2026-10-18
- react
- knowledge.controller.ts
- tsconfig.build.json
- @nestjs/common
- nextjs/README.md
- invitations/page.tsx
- Confirm your DevArena email template
- profile/page.tsx
- ChallengeModal.tsx
- CatalogQueryDto
- sw.js
- (auth)/layout.tsx
- duel.ts
- SkillInsightsService
- engines
- nextjs/AGENTS.md
- Browser window with three toolbar controls
- AuthUser
- Document file icon with folded corner and text lines
- Globe icon
- Next.js wordmark
- Vercel white triangular logo
- ChallengeSkillsController
- ref_node_assert
- AdminMarketplaceController
- SetChallengeSkillsDto
- check-recruiter-candidates.mjs
- Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries
- UpdateProfileDto
- useQuizDuel
- recovery.ts
- ItemDialog
- RecruiterDashboard.tsx
- skill-associations/page-client.tsx
- ChallengeSkillsService
- ChallengeSkillItemDto
- MeSkillsController
- SetStatusDto
- ProfileProgress
- AdminPage
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
- DevArena UI handoff
- AnimationKeyForKind
- RespondInvitationDto
- Battle Code integration
- BYTE workspace guide
- README.md
- Aziz + Syrine integration
- Skills and Technology Management
- check-duel.mjs
- .deleteMe
- check-register-http.mjs
- Run locally with CMD
- nextjs/eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 75 edges
2. `react` - 69 edges
3. `AuthUser` - 52 edges
4. `next` - 52 edges
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
- `Session` --references--> `useAuth()`  [INFERRED]
  SPEC-identity.md → nextjs/src/hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (132 total, 28 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.10
Nodes (26): Automated evidence (2026-10-19), DevArena identity checks: T3a–T11 (Phase 4 Cutover), Live checks for the human (pending), Project graph, Spec Success Criteria Status (SPEC-identity.md), emailTypes, GET(), LoginContent() (+18 more)

### Community 1 - "ListUsersQueryDto"
Cohesion: 0.12
Nodes (8): escapeSearchTerm(), ListUsersQueryDto, UsersTable(), Phase 6 — `user-admin`, T18: List users (API + UI), T19: Change role, T20: Suspend / reactivate, T21: Delete user

### Community 2 - "backend/package.json"
Cohesion: 0.07
Nodes (31): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+23 more)

### Community 3 - "auth.module.ts"
Cohesion: 0.06
Nodes (31): AppModule, AuthModule, ProblemDetailsFilter, respond(), DuelModule, KnowledgeModule, EquipDto, UnequipDto (+23 more)

### Community 4 - "duel.types.ts"
Cohesion: 0.09
Nodes (33): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, AuthenticatedPlayer, DuelClientEvent (+25 more)

### Community 5 - "apiRequest"
Cohesion: 0.14
Nodes (22): instant, ResourcePage(), instant, LearningProgressPage(), instant, SavedResourcesPage(), ImportResources(), importCsv() (+14 more)

### Community 6 - "InvitationsService"
Cohesion: 0.11
Nodes (4): CreateInvitationDto, InvitationsController, InvitationsService, isSchemaCacheMissing()

### Community 7 - "SupabaseService"
Cohesion: 0.11
Nodes (15): AccountService, setup(), InvitationItem, Database, Json, SupabaseService, AdminUserItem, CandidateItem (+7 more)

### Community 8 - "SkillsWorkspace.tsx"
Cohesion: 0.05
Nodes (34): Shared implementation, metadata, RootLayout(), viewport, metadata, OfflinePage(), AccountAvatar(), Account (+26 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "messaging.ts"
Cohesion: 0.15
Nodes (19): MessagesContent(), MessagesPage(), MessagesPageProps, metadata, ChatWorkspace(), ChatWorkspaceProps, useWebSocketChat(), connectSocket() (+11 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "createClient"
Cohesion: 0.13
Nodes (18): countries, AvatarUpload(), handleFileChange(), AvatarUploadProps, VALID_EXTENSIONS, DangerZone(), handleDelete(), DangerZoneProps (+10 more)

### Community 17 - "guards.ts"
Cohesion: 0.10
Nodes (20): Rule 5: Database Authoritative Security & Least Privilege Access, assertSafeAuthConfig(), AuthService, setup(), user, express-serve-static-core, Request, AdminGuard (+12 more)

### Community 18 - "CurrentUser"
Cohesion: 0.09
Nodes (6): CurrentUser, KnowledgeCatalogueService, AdminKnowledgeController, KnowledgeController, MyKnowledgeController, KnowledgeLearningService

### Community 19 - "next"
Cohesion: 0.07
Nodes (26): nextConfig, hooks, AdminUsersContent(), AdminUsersPage(), instant, metadata, instant, metadata (+18 more)

### Community 21 - "nextjs/package.json"
Cohesion: 0.12
Nodes (16): engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name, private (+8 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.05
Nodes (53): aborted, controller, element, late, ready(), route(), storage, values (+45 more)

### Community 23 - "KnowledgeDetail.tsx"
Cohesion: 0.12
Nodes (37): EditKnowledgePage(), instant, instant, NewKnowledgePage(), instant, KnowledgeAdminPage(), instant, KnowledgePage() (+29 more)

### Community 24 - "Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)"
Cohesion: 0.13
Nodes (14): Assumptions (correct me now), Boundaries, Code style, Commands, Decisions (approved 2026-10-19), Design system (tokens, in `globals.css` `@theme`), Motion (all gated by `prefers-reduced-motion: no-preference`), Objective (+6 more)

### Community 25 - "1. Prime Directives for All Agents"
Cohesion: 0.15
Nodes (12): 1. Prime Directives for All Agents, DevArena: Engineering Governance & Agent Rules (AGENTS.md), Rule 10: Mandatory Review Receipts (Exit Criteria), Rule 11: Phase Transition Gate (Run, Human Approval, Git Push), Rule 1: Spec & Plan First (No Guesswork), Rule 2: Mandatory Graphify Context Across the Entire Session, Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev"), Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors (+4 more)

### Community 26 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:roles, start, start:debug, start:dev (+6 more)

### Community 27 - "DuelRoomService"
Cohesion: 0.11
Nodes (6): safeSend(), DuelGateway, DuelMatchmakingService, DuelRoomService, DuelRoomSession, WaitingPlayer

### Community 28 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+6 more)

### Community 29 - "AdminMarketplace.tsx"
Cohesion: 0.12
Nodes (17): AdminMarketplacePage(), instant, Account, AdminMarketplace(), archive(), grant(), save(), emptyItem() (+9 more)

### Community 30 - "RegisterForm.tsx"
Cohesion: 0.17
Nodes (12): hooks, ForgotPasswordPage(), metadata, metadata, RegisterPage(), TickIcon(), ForgotPasswordForm(), submit() (+4 more)

### Community 31 - "verify.mjs"
Cohesion: 0.27
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 32 - "Tasks: `identity` module"
Cohesion: 0.04
Nodes (45): Access control (D3, D4), `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Data Contract, Env (+37 more)

### Community 33 - "storage-smoke.mjs"
Cohesion: 0.20
Nodes (8): admin, { createClient }, files, options, png, require, users, WebSocket

### Community 34 - "MarketplaceApp.tsx"
Cohesion: 0.15
Nodes (16): instant, MarketplacePage(), EquippedSlot(), filters, kindLabel, MarketplaceApp(), applyInventory(), remove() (+8 more)

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

### Community 40 - "ref_node_module"
Cohesion: 0.17
Nodes (4): originalNavigator, hooks, failures, hooks

### Community 41 - "apple-icon.tsx"
Cohesion: 0.33
Nodes (6): AppleIcon(), contentType, size, GET(), sizes, monogram()

### Community 42 - "MeController"
Cohesion: 0.14
Nodes (8): MeController, event(), Phase 7 — `rankings`, T22: Dev seed script, T23: `dev_scores` view + `leaderboard()` function, T24: `GET /rankings`, T25: `/rankings` page, T26: Score and tier on `/profile`

### Community 43 - "TechnologiesService"
Cohesion: 0.08
Nodes (4): CreateTechnologyDto, slugify(), TechnologiesController, TechnologiesService

### Community 44 - "SkillsService"
Cohesion: 0.07
Nodes (5): CreateSkillDto, ListSkillsDto, SkillsController, SkillsService, slugify()

### Community 46 - "check-role-login.mjs"
Cohesion: 0.26
Nodes (10): __dirname, resolve(), testChallengesAccessProtection(), testHeaderLinks(), testLoginFormPersonaHandling(), testProfileRoleBoundaries(), testProxyNextRedirection(), testProxyRouteProtection() (+2 more)

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "ItemDialog.tsx"
Cohesion: 0.22
Nodes (9): AccountEquippedBadge(), EquippedMotion(), MOTION, useReducedMotion(), kindLabel, marketplaceHttp, marketplaceApi, ItemOffer (+1 more)

### Community 50 - "ProgressAdminController"
Cohesion: 0.09
Nodes (11): AttemptValidatedEvent, ProgressAdminController, AttemptInput, computeLevel(), LevelResult, SkillStatus, statusFromScore(), DIFFICULTY_WEIGHT (+3 more)

### Community 51 - "MessagingService"
Cohesion: 0.10
Nodes (8): InboundMessagePayload, MessagingGateway, ConversationItem, ConversationParticipant, isSchemaCacheMissing(), MessageItem, MessagingService, @nestjs/core

### Community 52 - "useAuth"
Cohesion: 0.28
Nodes (7): DevGuideProvider(), useAuth(), Phase 3 — Frontend, T10: Forgot / reset password, T6: Login slice, T7: `api.ts` Bearer + `useAuth` + logout, T8: `/register` + email confirmation

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.33
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "@nestjs/swagger"
Cohesion: 0.16
Nodes (8): AuthedRequest, UpdateTechnologyDto, UpdateSkillDto, AuthedRequest, SetRoleDto, class-transformer, class-validator, @nestjs/swagger

### Community 56 - "marketplace.service.ts"
Cohesion: 0.10
Nodes (14): SaveMarketplaceItemDto, KNOWN, mapMarketplaceError(), RpcFailure, isRecord(), ItemRow, MarketplaceDb, PurchaseRow (+6 more)

### Community 57 - "api.http.ts"
Cohesion: 0.23
Nodes (12): call(), isKnownCode(), KNOWN, marketplaceErrorFrom(), AdminMarketplaceItem, ChallengeOption, GrantCreditsInput, Inventory (+4 more)

### Community 58 - "MarketplaceService"
Cohesion: 0.19
Nodes (5): isUnknownArray(), MarketplaceService, AdminMarketplaceItem, Inventory, MarketplaceItem

### Community 59 - "UsersService"
Cohesion: 0.20
Nodes (3): TechnologiesController, TechnologyItem, UsersService

### Community 60 - "app/page.tsx"
Cohesion: 0.47
Nodes (4): Home(), steps, lines, TerminalHero()

### Community 61 - "Q: Which existing files should the login slice reuse?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which existing files should the login slice reuse?, Source Nodes

### Community 62 - "Q: How does the completed T7 header obtain its account data?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How does the completed T7 header obtain its account data?, Source Nodes

### Community 63 - "resolveRoleDestination"
Cohesion: 0.18
Nodes (13): Features and mapping, EquippedBadge(), resolveRoleDestination(), ✅ Checkpoint I — role-workflows done, Phase 9 — Role-Specific Workflows & Boundaries, T31: Role-Specific Application Shell & Navigation, T32: Profile & Settings Role Isolation, T33: Route Access Control & Challenge Enforcement (+5 more)

### Community 64 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 65 - "react"
Cohesion: 0.06
Nodes (44): instant, DashboardPage(), instant, DiscoverPage(), Technology, instant, ProfilePage(), instant (+36 more)

### Community 66 - "knowledge.controller.ts"
Cohesion: 0.08
Nodes (24): RESOURCE_SELECT, usableResource(), AdminKnowledgeQuery, DIFFICULTIES, EventDto, FeedbackDto, ImportDto, KnowledgeQuery (+16 more)

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 68 - "@nestjs/common"
Cohesion: 0.10
Nodes (17): AssignmentsController, MyAssignmentsController, PracticeDirectoryController, AssignmentsService, AuthedRequest, ATTEMPT_VALIDATED, AttemptValidatedListener, AuthedRequest (+9 more)

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 70 - "invitations/page.tsx"
Cohesion: 0.25
Nodes (12): InvitationsContent(), InvitationsPage(), metadata, InvitationsManager(), handleRealtimeEvent(), loadData(), InvitationsManagerProps, acceptInvitation() (+4 more)

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "profile/page.tsx"
Cohesion: 0.24
Nodes (8): instant, metadata, ProfileContent(), ProfilePage(), UserProfileData, ProfileHeader(), getCountryName(), lucide-react

### Community 73 - "ChallengeModal.tsx"
Cohesion: 0.09
Nodes (24): ArenaPage(), Challenge, instant, AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords(), ChallengeModal() (+16 more)

### Community 74 - "CatalogQueryDto"
Cohesion: 0.09
Nodes (3): CatalogController, CatalogService, CatalogQueryDto

### Community 77 - "duel.ts"
Cohesion: 0.08
Nodes (25): DuelClientEvent, DuelClientEventType, DuelDriverType, DuelErrorPayload, DuelJoinPayload, DuelMatchAcceptedUpdatePayload, DuelMatchAcceptPayload, DuelMatchCancelledPayload (+17 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.16
Nodes (3): MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 82 - "AuthUser"
Cohesion: 0.22
Nodes (3): AuthUser, MarketplaceController, RequestWithUser

### Community 88 - "ref_node_assert"
Cohesion: 0.10
Nodes (19): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+11 more)

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.13
Nodes (9): apply, env, fs, input, { parseEnv }, path, __dirname, resolve() (+1 more)

### Community 92 - "Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries"
Cohesion: 0.20
Nodes (9): Boundaries, Code Style & Conventions, Commands, Objective, Open Questions for Clarification, Project Structure & Touched Boundaries, Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries, Success Criteria (+1 more)

### Community 94 - "UpdateProfileDto"
Cohesion: 0.14
Nodes (3): IsIsoCountry(), regionDisplayNames, UpdateProfileDto

### Community 95 - "useQuizDuel"
Cohesion: 0.24
Nodes (13): DuelPage(), instant, metadata, DuelArena(), soloRound(), useQuizDuel(), answer(), leave() (+5 more)

### Community 96 - "recovery.ts"
Cohesion: 0.36
Nodes (6): metadata, ResetPasswordPage(), ResetPasswordForm(), submit(), updatePassword(), UpdatePasswordResult

### Community 97 - "ItemDialog"
Cohesion: 0.39
Nodes (7): ItemDialog(), buy(), equip(), readHint(), messageOf(), subscribe(), useMarketplaceOnline()

### Community 98 - "RecruiterDashboard.tsx"
Cohesion: 0.31
Nodes (7): POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps, buildCandidatesQuery(), CandidateItem, CandidatesResponse

### Community 99 - "skill-associations/page-client.tsx"
Cohesion: 0.18
Nodes (9): AssociationsPage(), find(), ChallengeSkills(), initialize(), Developer, DeveloperSkills(), Link, Reference (+1 more)

### Community 104 - "ProfileProgress"
Cohesion: 0.53
Nodes (5): ProfileProgress(), 1. Admin Role, 2. Recruiter Role, 3. Developer Role, Detailed Specifications by Role

### Community 105 - "AdminPage"
Cohesion: 0.33
Nodes (4): AdminPage(), run(), saveTech(), SkillFormModal()

### Community 106 - "useQuizDuel.ts"
Cohesion: 0.28
Nodes (10): resolveSolo(), soloResult(), DEFAULT_DUEL_QUESTIONS, addResult(), BattleState, calculatePoints(), ROUND_TIME_MS, DuelServerEvent (+2 more)

### Community 107 - "duel.gateway.spec.ts"
Cohesion: 0.24
Nodes (7): Session, connect(), ids, Message, signedIn(), wait(), DuelServerEvent

### Community 108 - "Knowledge Management"
Cohesion: 0.18
Nodes (11): API, Configuration and startup (CMD), Coursera CSV import, Database and deployment, Frontend routes, Human-reviewed evaluation, Knowledge Management, Knowledge navigation validation (+3 more)

### Community 109 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, test:auth, test:duel, test:guide (+3 more)

### Community 110 - "check-knowledge.mjs"
Cohesion: 0.16
Nodes (9): evaluate(), fs, metrics(), hooks, require, classify(), ctx, manifestSrc (+1 more)

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

### Community 118 - "DevArena UI handoff"
Cohesion: 0.40
Nodes (4): Checks and limits, Completed presentation checklist, DevArena UI handoff, Translation and English-copy file inventory

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
Cohesion: 0.29
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 126 - "check-duel.mjs"
Cohesion: 0.33
Nodes (5): question, resolve, result, state, wrong

### Community 128 - ".deleteMe"
Cohesion: 0.17
Nodes (7): DeleteMeDto, Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data, T17: Self-service account deletion

### Community 130 - "check-register-http.mjs"
Cohesion: 0.40
Nodes (4): checks, href, link, rendered

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

## Knowledge Gaps
- **636 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+631 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1033 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `safeNext`, `apiRequest`, `SkillsWorkspace.tsx`, `messaging.ts`, `createClient`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `KnowledgeDetail.tsx`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `MarketplaceApp.tsx`, `ItemDialog.tsx`, `useAuth`, `invitations/page.tsx`, `profile/page.tsx`, `ChallengeModal.tsx`, `useQuizDuel`, `recovery.ts`, `ItemDialog`, `RecruiterDashboard.tsx`, `skill-associations/page-client.tsx`, `useQuizDuel.ts`, `check-knowledge.mjs`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `backend/package.json`, `auth.module.ts`, `duel.types.ts`, `knowledge.controller.ts`, `SupabaseService`, `duel.gateway.spec.ts`, `guards.ts`, `marketplace.service.spec.ts`, `MessagingService`, `@nestjs/swagger`, `marketplace.service.ts`, `UsersService`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `safeNext`, `SkillsWorkspace.tsx`, `messaging.ts`, `createClient`, `nextjs/package.json`, `DevGuide.tsx`, `KnowledgeDetail.tsx`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `MarketplaceApp.tsx`, `apple-icon.tsx`, `useAuth`, `react`, `invitations/page.tsx`, `profile/page.tsx`, `ChallengeModal.tsx`, `useQuizDuel`, `recovery.ts`, `RecruiterDashboard.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _636 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeNext` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._
- **Should `ListUsersQueryDto` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06628787878787878 - nodes in this community are weakly interconnected._