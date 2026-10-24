# Graph Report - DEVARENA  (2026-10-24)

## Corpus Check
- 346 files · ~159,937 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 8, (none) 3, .example 3)

## Summary
- 2360 nodes · 4998 edges · 139 communities (109 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 247 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34da80d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- safeNext
- ListUsersQueryDto
- backend/package.json
- auth.module.ts
- duel.types.ts
- knowledge.spec.ts
- InvitationsService
- SupabaseService
- react
- devDependencies
- MessagingController
- compilerOptions
- createClient
- RecruiterCandidatesController
- compilerOptions
- createClient
- guards.ts
- .check
- next
- MeProfileController
- nextjs/package.json
- DevGuide.tsx
- apiRequest
- Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)
- 1. Prime Directives for All Agents
- scripts
- DuelRoomService
- dependencies
- AdminMarketplace.tsx
- RegisterForm.tsx
- verify.mjs
- Spec: `identity` — Accounts, Sessions & Access Control
- storage-smoke.mjs
- AuthUser
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
- auth.service.spec.ts
- ProgressAdminController
- MessagingService
- MyKnowledgeController
- Identity database: T1–T3a
- nest-cli.json
- users.service.ts
- marketplace.service.ts
- marketplace.controller.ts
- MarketplaceService
- UsersService
- app/page.tsx
- Q: Which existing files should the login slice reuse?
- Q: How does the completed T7 header obtain its account data?
- skills/types.ts
- Identity precheck results — 2026-10-18
- my-skills/page-client.tsx
- knowledge.controller.ts
- tsconfig.build.json
- @nestjs/common
- nextjs/README.md
- level.calculator.ts
- Confirm your DevArena email template
- SkillsWorkspace.tsx
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
- dashboard/page-client.tsx
- ref_node_assert
- AdminMarketplaceController
- ChallengeSkillsService
- check-recruiter-candidates.mjs
- Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries
- management.spec.ts
- UpdateProfileDto
- useQuizDuel
- recovery.ts
- Tasks: `identity` module
- RecruiterDashboard.tsx
- skill-associations/page-client.tsx
- ListCandidatesQueryDto
- check-recruiter-invitations-chat.mjs
- MeSkillsController
- .delete
- check-pwa.mjs
- skills/api.ts
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
- AccountProvider
- AnimationKeyForKind
- UsersTable
- Battle Code integration
- BYTE workspace guide
- README.md
- Aziz + Syrine integration
- Skills and Technology Management
- check-duel.mjs
- .inventory
- Phase 5 — `profile`
- Data Contract
- check-register-http.mjs
- Run locally with CMD
- nextjs/eslint.config.mjs
- Frontend Contract
- DevArena identity checks: T3a–T11 (Phase 4 Cutover)
- Phase 1 — Database
- fakeStore
- Phase 0 — Setup

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
- `Features and mapping` --references--> `EquippedBadge()`  [INFERRED]
  docs/marketplace-integration.md → nextjs/src/components/marketplace/EquippedBadge.tsx

## Import Cycles
- None detected.

## Communities (139 total, 30 thin omitted)

### Community 0 - "safeNext"
Cohesion: 0.10
Nodes (29): Automated evidence (2026-10-19), Spec Success Criteria Status (SPEC-identity.md), emailTypes, GET(), LoginContent(), LoginPage(), metadata, LoginForm() (+21 more)

### Community 1 - "ListUsersQueryDto"
Cohesion: 0.15
Nodes (3): escapeSearchTerm(), ListUsersQueryDto, T18: List users (API + UI)

### Community 2 - "backend/package.json"
Cohesion: 0.06
Nodes (32): author, description, eslint, @supabase/supabase-js, @types/node, typescript, license, name (+24 more)

### Community 3 - "auth.module.ts"
Cohesion: 0.10
Nodes (20): AuthModule, DuelModule, MessagingModule, SkillsModule, SupabaseModule, MockAuth, MockAuthAdmin, MockStorage (+12 more)

### Community 4 - "duel.types.ts"
Cohesion: 0.09
Nodes (33): ACCEPT_TIMEOUT_MS, calculatePoints(), DEFAULT_DUEL_QUESTIONS, MAX_ROUNDS, RESOLUTION_DURATION_MS, ROUND_DURATION_MS, AuthenticatedPlayer, DuelClientEvent (+25 more)

### Community 5 - "knowledge.spec.ts"
Cohesion: 0.13
Nodes (14): KnowledgeCatalogueService, RESOURCE_SELECT, usableResource(), DIFFICULTY, KnowledgeImportService, normalizedImport(), parseCsv(), KnowledgeModule (+6 more)

### Community 6 - "InvitationsService"
Cohesion: 0.14
Nodes (4): CreateInvitationDto, InvitationItem, InvitationsService, isSchemaCacheMissing()

### Community 7 - "SupabaseService"
Cohesion: 0.15
Nodes (10): AccountService, setup(), ConversationItem, ConversationParticipant, MessageItem, Database, SupabaseService, MockAccountService (+2 more)

### Community 8 - "react"
Cohesion: 0.10
Nodes (16): metadata, RootLayout(), viewport, metadata, OfflinePage(), dismissed(), InstallEvent, InstallPrompt() (+8 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "createClient"
Cohesion: 0.10
Nodes (25): hooks, MessagesContent(), MessagesPage(), MessagesPageProps, metadata, AccountContext, formatAccountError(), useAccountState() (+17 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "createClient"
Cohesion: 0.16
Nodes (13): countries, EquippedBadge(), DEFAULT_TECHNOLOGIES, ProfileForm(), ProfileFormProps, TechnologyOption, ProfileHeader(), CountryOption (+5 more)

### Community 17 - "guards.ts"
Cohesion: 0.16
Nodes (13): Rule 5: Database Authoritative Security & Least Privilege Access, express-serve-static-core, Request, AdminGuard, DeveloperGuard, OptionalAuthGuard, RecruiterGuard, UserGuard (+5 more)

### Community 19 - "next"
Cohesion: 0.09
Nodes (20): nextConfig, AdminUsersContent(), AdminUsersPage(), instant, metadata, InvitationsContent(), InvitationsPage(), metadata (+12 more)

### Community 20 - "MeProfileController"
Cohesion: 0.14
Nodes (3): DeleteMeDto, MeProfileController, T17: Self-service account deletion

### Community 21 - "nextjs/package.json"
Cohesion: 0.12
Nodes (15): engines, node, eslint, @supabase/supabase-js, @types/node, typescript, name, private (+7 more)

### Community 22 - "DevGuide.tsx"
Cohesion: 0.05
Nodes (53): aborted, controller, element, late, ready(), route(), storage, values (+45 more)

### Community 23 - "apiRequest"
Cohesion: 0.05
Nodes (87): EditKnowledgePage(), instant, instant, NewKnowledgePage(), instant, KnowledgeAdminPage(), instant, ResourcePage() (+79 more)

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
Cohesion: 0.06
Nodes (61): AdminMarketplacePage(), instant, instant, MarketplacePage(), Account, AdminMarketplace(), archive(), grant() (+53 more)

### Community 30 - "RegisterForm.tsx"
Cohesion: 0.21
Nodes (11): ForgotPasswordPage(), metadata, metadata, RegisterPage(), TickIcon(), ForgotPasswordForm(), submit(), RegisterForm() (+3 more)

### Community 31 - "verify.mjs"
Cohesion: 0.24
Nodes (9): before, bucket(), bucketBefore, local, migrations, psql(), root, run() (+1 more)

### Community 32 - "Spec: `identity` — Accounts, Sessions & Access Control"
Cohesion: 0.18
Nodes (10): `AccountService.delete(userId, actorId)`, Backend Contract, Boundaries, Code Style, Commands, Objective, Project Structure (new/changed only; reconciled with the real tree before planning), Resolved questions (2026-10-18) (+2 more)

### Community 33 - "storage-smoke.mjs"
Cohesion: 0.20
Nodes (8): admin, { createClient }, files, options, png, require, users, WebSocket

### Community 34 - "AuthUser"
Cohesion: 0.12
Nodes (4): AuthUser, CurrentUser, InvitationsController, RequestWithUser

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
Nodes (8): DEMO_USERS, __dirname, env, envPath, supabase, __dirname, resolve(), testPrivacyCompliance()

### Community 39 - "Email registration setup (T8)"
Cohesion: 0.29
Nodes (6): Configure the dashboard, Email registration setup (T8), Forgot / reset password (T10), GitHub + Google OAuth (T9), Repeat local checks, Verify real registration

### Community 40 - "ref_node_module"
Cohesion: 0.13
Nodes (6): destination, originalNavigator, hooks, hooks, failures, hooks

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
Cohesion: 0.24
Nodes (11): __dirname, resolve(), testAccountProviderResilience(), testChallengesAccessProtection(), testHeaderLinks(), testLoginFormPersonaHandling(), testProfileRoleBoundaries(), testProxyNextRedirection() (+3 more)

### Community 47 - "Implementation Plan: DevArena User & Auth initiative"
Cohesion: 0.25
Nodes (7): API Contracts (define before parallel work), Dependency Graph, Implementation Plan: DevArena User & Auth initiative, Open Questions (rankings/profile; answer before T23 / T16), Overview, Risks and Mitigations, Task List (details in `tasks/todo.md`)

### Community 48 - "CategoriesService"
Cohesion: 0.09
Nodes (5): CategoriesController, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto

### Community 49 - "auth.service.spec.ts"
Cohesion: 0.16
Nodes (9): AppModule, assertSafeAuthConfig(), AuthService, setup(), user, ProblemDetailsFilter, respond(), bootstrap() (+1 more)

### Community 51 - "MessagingService"
Cohesion: 0.11
Nodes (5): InboundMessagePayload, MessagingGateway, isSchemaCacheMissing(), MessagingService, @nestjs/core

### Community 53 - "Identity database: T1–T3a"
Cohesion: 0.33
Nodes (6): Configure the dedicated dev project, Deletion contract, Files and order, Identity database: T1–T3a, Isolated local PostgreSQL proof, Rollback and shared-project cutover

### Community 54 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 55 - "users.service.ts"
Cohesion: 0.08
Nodes (16): RespondInvitationDto, AuthedRequest, UpdateSkillDto, Json, IsIsoCountry(), regionDisplayNames, SetRoleDto, AdminUserItem (+8 more)

### Community 56 - "marketplace.service.ts"
Cohesion: 0.10
Nodes (14): SaveMarketplaceItemDto, KNOWN, mapMarketplaceError(), RpcFailure, isRecord(), ItemRow, MarketplaceDb, PurchaseRow (+6 more)

### Community 57 - "marketplace.controller.ts"
Cohesion: 0.17
Nodes (6): EquipDto, UnequipDto, userLimit, MarketplaceModule, MarketplaceUserThrottlerGuard, @nestjs/throttler

### Community 58 - "MarketplaceService"
Cohesion: 0.22
Nodes (4): isUnknownArray(), MarketplaceService, AdminMarketplaceItem, MarketplaceItem

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

### Community 63 - "skills/types.ts"
Cohesion: 0.15
Nodes (14): Detail, SkillDetailContent(), SkillDetailPage(), instant, ChallengeCategory, ChallengeDifficulty, ChallengeState, ChallengeSummary (+6 more)

### Community 64 - "Identity precheck results — 2026-10-18"
Cohesion: 0.33
Nodes (5): Cloud advisor results, Identity precheck results — 2026-10-18, Outstanding before Checkpoint A can be marked complete, T3a follow-up, 2026-10-18, Verification evidence

### Community 65 - "my-skills/page-client.tsx"
Cohesion: 0.18
Nodes (11): DiscoverPage(), Technology, instant, ProfilePage(), instant, RadarChart(), RadarChartProps, SkillCard() (+3 more)

### Community 66 - "knowledge.controller.ts"
Cohesion: 0.18
Nodes (10): AdminKnowledgeQuery, DIFFICULTIES, EventDto, FeedbackDto, ImportDto, KnowledgeQuery, ProgressDto, RESOURCE_TYPES (+2 more)

### Community 67 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 68 - "@nestjs/common"
Cohesion: 0.13
Nodes (12): CatalogService, AuthedRequest, ATTEMPT_VALIDATED, AttemptValidatedEvent, AttemptValidatedListener, AuthedRequest, AttemptState, DIFFICULTY_ORDER (+4 more)

### Community 69 - "nextjs/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 70 - "level.calculator.ts"
Cohesion: 0.23
Nodes (9): AttemptInput, computeLevel(), LevelResult, SkillStatus, statusFromScore(), DIFFICULTY_WEIGHT, MIN_ATTEMPTS, SCORING_VERSION (+1 more)

### Community 71 - "Confirm your DevArena email template"
Cohesion: 0.50
Nodes (4): Confirm your DevArena email template, Email OTP type, RedirectTo template variable, TokenHash template variable

### Community 72 - "SkillsWorkspace.tsx"
Cohesion: 0.13
Nodes (10): AccountAvatar(), Account, ApplicationShell(), AuthHeader(), administration, navigation, recruiterNavigation, SkillsWorkspace() (+2 more)

### Community 73 - "ChallengeModal.tsx"
Cohesion: 0.09
Nodes (25): ArenaPage(), Challenge, instant, useAccount(), AI_CODE_REVIEW_QUESTIONS, AI_TRAP_QUESTIONS, ALGORITHMS_QUESTIONS, bankFromKeywords() (+17 more)

### Community 77 - "duel.ts"
Cohesion: 0.08
Nodes (25): DuelClientEvent, DuelClientEventType, DuelDriverType, DuelErrorPayload, DuelJoinPayload, DuelMatchAcceptedUpdatePayload, DuelMatchAcceptPayload, DuelMatchCancelledPayload (+17 more)

### Community 78 - "SkillInsightsService"
Cohesion: 0.15
Nodes (4): AuthedRequest, MeSkillChallengesController, SkillStatsController, SkillInsightsService

### Community 87 - "dashboard/page-client.tsx"
Cohesion: 0.29
Nodes (5): DashboardPage(), instant, HistoryChart(), useSkillSummary(), SkillHistoryPoint

### Community 88 - "ref_node_assert"
Cohesion: 0.12
Nodes (13): assert, fs, {PGlite}, assert, fs, {
  PGlite,
}, assert, fs (+5 more)

### Community 90 - "ChallengeSkillsService"
Cohesion: 0.08
Nodes (4): ChallengeSkillsController, ChallengeSkillsService, ChallengeSkillItemDto, SetChallengeSkillsDto

### Community 91 - "check-recruiter-candidates.mjs"
Cohesion: 0.12
Nodes (11): apply, env, fs, input, { parseEnv }, path, assert, fs (+3 more)

### Community 92 - "Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries"
Cohesion: 0.15
Nodes (14): ProfileProgress(), 1. Admin Role, 2. Recruiter Role, 3. Developer Role, Boundaries, Code Style & Conventions, Commands, Detailed Specifications by Role (+6 more)

### Community 93 - "management.spec.ts"
Cohesion: 0.11
Nodes (8): AssignmentsController, AuthRequest, MyAssignmentsController, PracticeDirectoryController, AssignmentsService, UpdateTechnologyDto, AuthedRequest, T30: Backend Role-Based Profile & Guard Isolation

### Community 95 - "useQuizDuel"
Cohesion: 0.24
Nodes (13): DuelPage(), instant, metadata, DuelArena(), soloRound(), useQuizDuel(), answer(), leave() (+5 more)

### Community 96 - "recovery.ts"
Cohesion: 0.18
Nodes (12): metadata, ResetPasswordPage(), ResetPasswordForm(), submit(), updatePassword(), UpdatePasswordResult, Phase 3 — Frontend, T10: Forgot / reset password (+4 more)

### Community 97 - "Tasks: `identity` module"
Cohesion: 0.18
Nodes (11): ✅ Checkpoint A, ✅ Checkpoint B, ✅ Checkpoint C, ✅ Checkpoint D — identity done, ✅ Checkpoint E — profile done, ✅ Checkpoint F — user-admin done, ✅ Checkpoint G — rankings done, ✅ Checkpoint H — initiative done (+3 more)

### Community 98 - "RecruiterDashboard.tsx"
Cohesion: 0.21
Nodes (11): instant, metadata, RecruiterContent(), RecruiterPage(), POPULAR_TECHS, RecruiterDashboard(), loadCandidates(), RecruiterDashboardProps (+3 more)

### Community 99 - "skill-associations/page-client.tsx"
Cohesion: 0.18
Nodes (9): AssociationsPage(), find(), ChallengeSkills(), initialize(), Developer, DeveloperSkills(), Link, Reference (+1 more)

### Community 103 - ".delete"
Cohesion: 0.29
Nodes (5): Success Criteria, Superseded open questions (kept for history), Testing Strategy, Phase 2 — Backend, T5: `AccountService.delete`

### Community 104 - "check-pwa.mjs"
Cohesion: 0.33
Nodes (4): classify(), ctx, manifestSrc, sw

### Community 105 - "skills/api.ts"
Cohesion: 0.12
Nodes (13): AdminPage(), run(), saveTech(), instant, Props, Reference, SkillFormModal(), AdminTechnology (+5 more)

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
Cohesion: 0.43
Nodes (4): ensureUsers(), psql(), psqlArgs(), walletLockVisible()

### Community 118 - "AccountProvider"
Cohesion: 0.05
Nodes (41): UserProfileResponse, Checks and limits, Completed presentation checklist, DevArena UI handoff, Shared implementation, Translation and English-copy file inventory, AccountProvider(), 1. Objective (+33 more)

### Community 120 - "UsersTable"
Cohesion: 0.47
Nodes (5): UsersTable(), Phase 6 — `user-admin`, T19: Change role, T20: Suspend / reactivate, T21: Delete user

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
Cohesion: 0.29
Nodes (6): Administrator flows, Developer flows and scoring, Endpoints added or completed, Required SQL, Skills and Technology Management, Verification

### Community 126 - "check-duel.mjs"
Cohesion: 0.33
Nodes (5): question, resolve, result, state, wrong

### Community 128 - "Phase 5 — `profile`"
Cohesion: 0.40
Nodes (5): Phase 5 — `profile`, T12: Migration `profile_technologies` + `update_profile()`, T14: `/profile/settings` form (text fields), T15: Avatar upload, T16: `/profile` on real data

### Community 129 - "Data Contract"
Cohesion: 0.40
Nodes (5): Access control (D3, D4), Data Contract, Other schema changes, `public.profiles` (ALTER the existing table; it already has `id, email, username, role, avatar_url, bio, created_at`), Triggers

### Community 130 - "check-register-http.mjs"
Cohesion: 0.40
Nodes (4): checks, href, link, rendered

### Community 131 - "Run locally with CMD"
Cohesion: 0.40
Nodes (5): 1. Install dependencies, 2. Configure the services, 3. Check the database, 4. Start both services, Run locally with CMD

### Community 133 - "Frontend Contract"
Cohesion: 0.40
Nodes (5): Env, Frontend Contract, Routes, Session, Supabase dashboard configuration (manual, documented in the plan)

### Community 134 - "DevArena identity checks: T3a–T11 (Phase 4 Cutover)"
Cohesion: 0.50
Nodes (3): DevArena identity checks: T3a–T11 (Phase 4 Cutover), Live checks for the human (pending), Project graph

### Community 135 - "Phase 1 — Database"
Cohesion: 0.50
Nodes (4): Phase 1 — Database, T2: Migration `identity_profiles`, T3: Migration `identity_deletion`, T3a: Review fixes (Antigravity audit 2026-10-18, triaged)

### Community 138 - "Phase 0 — Setup"
Cohesion: 0.67
Nodes (3): Phase 0 — Setup, T0: Workspace, T1: Secrets, Supabase project, schema snapshot

## Knowledge Gaps
- **41 isolated node(s):** `@supabase/supabase-js`, `reflect-metadata`, `rxjs`, `@eslint/eslintrc`, `@nestjs/cli` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1044 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `safeNext`, `createClient`, `createClient`, `next`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `skills/types.ts`, `my-skills/page-client.tsx`, `SkillsWorkspace.tsx`, `ChallengeModal.tsx`, `dashboard/page-client.tsx`, `useQuizDuel`, `recovery.ts`, `RecruiterDashboard.tsx`, `skill-associations/page-client.tsx`, `skills/api.ts`, `useQuizDuel.ts`, `check-knowledge.mjs`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `reflect-metadata`, `rxjs` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeNext` be split into smaller, more focused modules?**
  _Cohesion score 0.1039136302294197 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `backend/package.json`, `auth.module.ts`, `duel.types.ts`, `knowledge.spec.ts`, `knowledge.controller.ts`, `SupabaseService`, `InvitationsService`, `duel.gateway.spec.ts`, `SkillInsightsService`, `auth.service.spec.ts`, `guards.ts`, `marketplace.service.spec.ts`, `MessagingService`, `users.service.ts`, `marketplace.service.ts`, `marketplace.controller.ts`, `management.spec.ts`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `safeNext`, `react`, `createClient`, `createClient`, `nextjs/package.json`, `DevGuide.tsx`, `apiRequest`, `AdminMarketplace.tsx`, `RegisterForm.tsx`, `apple-icon.tsx`, `skills/types.ts`, `my-skills/page-client.tsx`, `SkillsWorkspace.tsx`, `ChallengeModal.tsx`, `dashboard/page-client.tsx`, `useQuizDuel`, `recovery.ts`, `RecruiterDashboard.tsx`, `skills/api.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `auth.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._