# Spec: DevArena Platform Integration & Feature Merge (SPEC-platform-merge.md)

**Initiative:** Full-Stack Merge of `feature/devarena-integrated-platform` into `user-integrated`  
**Status:** In Review (Spec-Driven Development — Phase 1)  
**Target Architecture:** NestJS 11 + Next.js 16.4 PWA + Supabase PostgreSQL 17.11  
**Reference Documents:**
- [`AGENTS.md`](file:///D:/5SIM4/PWA/app/DEVARENA/AGENTS.md) — Engineering Governance & Agent Rules
- [`plan.md`](file:///D:/5SIM4/PWA/app/DEVARENA/plan.md) — Master Implementation Plan
- [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md) — Task Tracker & Checkpoint Gates
- [`SPEC-identity.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-identity.md) — Identity, RBAC & Role Isolation
- [`SPEC-pwa.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-pwa.md) — PWA & Offline Engine Spec

---

## 1. Assumptions & Baseline Floor

Before undertaking the merge, the following assumptions are surfaced and locked:
1. **Source of Truth Branch:** `user-integrated` is the primary production branch holding complete Identity, RBAC, Recruiter Hub & Invitations delivery, 1v1 Duel Arena with Elo rankings & score multipliers, and PWA offline dashboard.
2. **Feature Branch Delta:** `origin/feature/devarena-integrated-platform` contains valuable new modules created by the team (Community Forum/Discuss, Problems Bank & Administration, Question Banks, Gemini AI Code Review, Lesson Explanations, Landing Showcases, and PWA Install Button). However, it branched off early and deleted or omitted our governance files (`AGENTS.md`, `plan.md`, `todo.md`, `SPEC-identity.md`, `SPEC-pwa.md`, `identity-e2e.md`, `supabase/tests/*`).
3. **Preservation Priority:** All governance documents, existing tests (29 backend suites, 15 frontend test scripts), role isolation guards (`DeveloperGuard`, `AdminGuard`, `RecruiterGuard`), and Elo duel mechanics MUST be preserved without regression.
4. **Zero-Billing Constraint:** The Gemini AI Code Review service operates gracefully via Google AI Free Tier API keys or offline fallback, adhering to Rule 8 (Zero-Billing Cloud).

---

## 2. Capability Map (Phase 0 Scope Check)

This merge initiative spans four independently testable capabilities:

| Module ID | Responsibility | Depends On |
|---|---|---|
| `core-platform-merge` | Git merge resolution, governance file preservation (`AGENTS.md`, `plan.md`, `todo.md`), dependency reconciliation (`package.json`), and core module registration (`app.module.ts`, `skills.module.ts`, `proxy.ts`, `ApplicationShell.tsx`) | — |
| `community-forum` | Discuss / Community forum backend (`community.module.ts`, `community.service.ts`, `community.controller.ts`, DTOs), PostgreSQL schema (`20261025000001_community_forum.sql`), and frontend Discuss UI (`/community`, `/admin/community`) | `core-platform-merge` |
| `skills-problems-review` | Problems administration (`problems.service.ts`, `problems.controller.ts`), Question Bank & Practice service (`practice.service.ts`), Gemini AI code review (`gemini-code-review.service.ts`), and frontend Problem Solver (`Problems.tsx`, `ProblemEditor.tsx`, `CodeReviewProgress.tsx`) while harmonizing `ChallengeModal.tsx` and `skill-progress.service.ts` | `core-platform-merge` |
| `pwa-landing-showcase` | Landing page showcase (`MobileShowcase.tsx`, `PartnerCarousel.tsx`, commercial assets) and PWA unified install experience (`InstallProvider.tsx`, `InstallButton.tsx`, `sw.js` offline library reader + offline dashboard) | `core-platform-merge` |

**Build & Verification Order:**  
`core-platform-merge` → `community-forum`, `skills-problems-review` → `pwa-landing-showcase` → Full Regression & Checkpoint Gate

---

## 3. Objective

Merge the remote feature branch `origin/feature/devarena-integrated-platform` (commits `6d4f04e` and `88c97a9`) into `user-integrated` while maintaining 100% test pass rates across NestJS and Next.js, eliminating all merge conflicts, and delivering a unified platform that contains:
1. **Community / Discuss Board:** Threaded developer discussions, category tagging, voting, post pinning, bookmarks, report moderation, and admin moderation dashboard.
2. **Problems & AI Code Review:** Interactive problem solving, multi-language code review powered by Gemini Flash, server-side practice question bank, and administrative problem authoring.
3. **PWA & Landing Experience:** Looping mobile app showcase with partner badges, standalone offline HTML/JS reading library, in-app PWA install trigger button, and persistent offline dashboard.
4. **Preserved Core:** 1v1 real-time WebSocket duels, competitive Elo leaderboard, recruiter candidate hub with direct invitation dispatch (`sendInvitation`), role-isolated auth proxies, and complete test suites.

---

## 4. Commands

```bash
# Backend Verification
npm --prefix backend test
npm --prefix backend run build

# Frontend Verification
npm --prefix nextjs run test:auth
npm --prefix nextjs run test:skills
npm --prefix nextjs run test:offline
npm --prefix nextjs run test:review:browser
npx tsc -p nextjs --noEmit

# Knowledge Graph Refresh
graphify update .

# Git Synchronization
git status
```

---

## 5. Project Structure

```
DEVARENA/
├── backend/
│   └── src/
│       ├── app.module.ts                 → Registers all modules (Auth, Users, Community, Skills, Knowledge, Marketplace, Duel, Messaging, Rankings)
│       ├── community/                    → Community / Discuss forum controllers, services, DTOs & specs
│       ├── skills/
│       │   ├── code-review/              → Gemini AI code review service, DTOs & specs
│       │   ├── practice/                 → Server-side question bank & practice service
│       │   ├── problems.controller.ts    → Problems & Admin problems endpoints
│       │   └── problems.service.ts       → Database problem catalogue with topic filters
│       └── knowledge/
│           └── knowledge-explanation.service.ts → AI lesson explanations
├── supabase/
│   └── migrations/
│       └── 20261025000001_community_forum.sql → Community forum tables, RLS & triggers
├── nextjs/
│   ├── public/
│   │   ├── sw.js                         → Unified Service Worker (caching offline library + shell + runner worker)
│   │   ├── offline.html                  → Standalone public reading shell
│   │   └── images/                       → Mobile showcase & partner brand assets
│   ├── scripts/
│   │   ├── check-safe-next.mjs ...       → 15 core auth, admin, recruiter, ranking & duel test scripts
│   │   ├── check-offline.cjs             → Standalone offline reader test script
│   │   └── check-review-browser.cjs      → Browser code review scenario test script
│   └── src/
│       ├── app/
│       │   ├── (skills)/community/       → Community feed, post detail, editor, saved posts
│       │   ├── (skills)/admin/community/ → Admin community moderation
│       │   ├── (skills)/admin/problems/  → Admin problem creation & editing
│       │   └── (skills)/arena/page-client.tsx → Unified Problems & challenge catalogue
│       ├── components/
│       │   ├── community/                → PostCard, CommentThread, PostEditor, AdminCommunity
│       │   ├── landing/                  → PartnerCarousel, MobileShowcase
│       │   ├── pwa/                      → InstallProvider, InstallButton, InstallPrompt, OfflineBanner
│       │   └── skills/                   → Problems, ProblemEditor, ProblemSolver, CodeReviewProgress
│       └── lib/
│           ├── community.ts              → Community API client
│           └── skills/
│               ├── code-review.ts        → Code review API client
│               └── practice.ts           → Practice API client
├── AGENTS.md                             → Engineering Governance (Preserved)
├── plan.md                               → Master Plan (Updated with Checkpoints Q–T)
└── todo.md                               → Task Tracker (Updated with Checkpoints Q–T)
```

---

## 6. Code Style & Ponytail Discipline

- **Ponytail Rule:** Smallest correct change. No speculative abstractions.
- **NestJS DTOs:** All request payloads must use `class-validator` decorators (`@IsString()`, `@IsUUID()`, `@IsNotEmpty()`, `@MinLength()`).
- **Standard Library First:** Gemini AI service uses native Node `fetch()` without importing heavyweight third-party SDKs.
- **Problem Details:** All HTTP exceptions return RFC-7807 compliant structures (`application/problem+json`).
- **Role Isolation:** Navigation and mutation endpoints verify role membership (`developer`, `recruiter`, `admin`) via `DeveloperGuard`, `RecruiterGuard`, and `AdminGuard`.

---

## 7. Testing Strategy

1. **Backend Jest Suite:**
   - Run all existing 29 suites + new suites (`community.spec.ts`, `problems-admin.spec.ts`, `problems-service.spec.ts`, `code-review.spec.ts`, `code-review-api.spec.ts`, `practice.spec.ts`, `practice-api.spec.ts`, `knowledge-explanation.spec.ts`).
   - Expected: 37+ test suites, ~450+ passing tests.
2. **Frontend Test Suite (`npm --prefix nextjs run test:auth`):**
   - Retain all 15 active scenario verification scripts without any deletion or weakening.
   - Verify `check-safe-next.mjs`, `check-api.mjs`, `check-register.mjs`, `check-oauth.mjs`, `check-recovery.mjs`, `check-profile.mjs`, `check-admin.mjs`, `check-pwa.mjs`, `check-role-login.mjs`, `check-recruiter-candidates.mjs`, `check-rankings.mjs`, `check-competitive-results.mjs`, `check-practice-loading.mjs`, `check-practice-history.mjs`, `check-duel-lifecycle.mjs`.
3. **New Frontend Verification Scripts:**
   - `check-offline.cjs`
   - `check-review-browser.cjs`
4. **Typecheck & Build:**
   - `npx tsc -p nextjs --noEmit` must report zero TypeScript errors.
   - `npm --prefix backend run build` must produce a valid NestJS dist bundle.

---

## 8. Boundaries

### Always
- Verify all unit and integration tests pass before completing any checkpoint.
- Keep all governance and specification files (`AGENTS.md`, `plan.md`, `todo.md`, `SPEC-identity.md`, `SPEC-pwa.md`, `SPEC-platform-merge.md`).
- Respect PostgreSQL RLS policies and database-authoritative role verification.
- Provide RFC-7807 problem details on error.

### Ask First
- Modifying or dropping existing database tables.
- Introducing new external NPM packages with non-zero license or build risks.
- Deleting any legacy component without confirming zero downstream dependencies.

### Never
- Never delete or weaken test assertions to achieve a green build.
- Never leak raw Supabase service keys, database passwords, or JWT secrets.
- Never bypass role guards (`UserGuard`, `AdminGuard`, `RecruiterGuard`, `DeveloperGuard`).
- Never overwrite `user-integrated` branch with remote branch via force-push or unchecked checkout.

---

## 9. Success Criteria

- [ ] Clean git merge between `HEAD` (`user-integrated`) and `origin/feature/devarena-integrated-platform`.
- [ ] Zero uncommitted conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- [ ] Backend test suite passes 100%: `npm --prefix backend test`.
- [ ] Backend build passes cleanly: `npm --prefix backend run build`.
- [ ] Frontend automated auth & feature test suite passes 100%: `npm --prefix nextjs run test:auth`.
- [ ] Frontend typecheck passes with zero errors: `npx tsc -p nextjs --noEmit`.
- [ ] Community forum (`/community` and `/admin/community`) functions properly.
- [ ] Problems bank, solver and code review function properly.
- [ ] PWA offline reader and offline dashboard coexist harmoniously.
- [ ] Graphify knowledge graph refreshed and healthy (`graphify update .`).
- [ ] Review receipt emitted per Rule 10 in `AGENTS.md`.

---

## 10. Open Questions for User Approval

1. **BYTE 3D Onboarding Guide vs. Video Commercial Showcase:** Remote removed `@react-three/fiber` and `DevGuide.tsx` in favor of the lightweight landing showcase (`MobileShowcase.tsx` and `PartnerCarousel.tsx`). We plan to adopt the new clean landing showcase while keeping the 3D dependencies optional or cleanly pruned if unused.
2. **Offline Experience Coexistence:** We will unify `public/sw.js` so it serves both the standalone offline reader (`/offline.html`) and the offline interactive runner worker, satisfying both `check-pwa.mjs` and `check-offline.cjs`.
