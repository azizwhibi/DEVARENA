# DevArena: Engineering Governance & Agent Rules (AGENTS.md)

**Project:** DevArena (Developer Coding Arena, Skill Progress, Rankings & Recruiter Talent Hub)  
**Target Architecture:** Full-Stack Modular TypeScript (NestJS 11 + Next.js 16.4 PWA + Supabase PostgreSQL 17.11)  
**Primary Architect:** Antigravity AI Engineering Assistant  
**Installed Skill Packs & MCPs:** `addyosmani/agent-skills`, `DietrichGebert/ponytail`, `Graphify MCP`  
**Reference Documents:**
- [`plan.md`](file:///D:/5SIM4/PWA/app/DEVARENA/plan.md) — Master Implementation Plan & Architecture Decisions
- [`SPEC-identity.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-identity.md) — Accounts, Sessions, RBAC & Guards Spec
- [`SPEC-pwa.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-pwa.md) — PWA Service Worker, Manifest & Arena UI Tokens Spec
- [`identity-e2e.md`](file:///D:/5SIM4/PWA/app/DEVARENA/identity-e2e.md) — Automated Evidence & Verification Runbook
- [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md) — Task Tracker & Checkpoint Gates (A–H)

---

## 1. Prime Directives for All Agents

Every AI agent, subagent, and human engineer working on this repository MUST strictly comply with the following eleven immutable rules:

### Rule 1: Spec & Plan First (No Guesswork)
- Never write application code before [`plan.md`](file:///D:/5SIM4/PWA/app/DEVARENA/plan.md), [`SPEC-identity.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-identity.md), and [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md) are established and consulted.
- Use `/agent-skills:spec-driven-development` and `/agent-skills:planning-and-task-breakdown` to initialize or refine module specifications.
- Every code addition or refactoring step must map directly to an active task ID in [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md).
- Adhere strictly to the defined Checkpoint gates (Checkpoint A through Checkpoint H).

### Rule 2: Mandatory Graphify Context Across the Entire Session
- **No Blind File Grepping:** Every agent and subagent spawned in Antigravity MUST query the **Graphify** knowledge graph (`graphify-out/graph.json`) before proposing architectural changes, tracing dependencies, or modifying interfaces.
- **Session-Wide Graph Sync:** Query the existing graph (`graphify query "<terms>"`, `graphify explain "path::symbol"`, or `graphify affected "<symbol>"`), then verify the cited source files before editing.
- **Blast-Radius Assessment:** Before editing any shared DTO, guard, model, or database table, use Graphify to inspect upstream/downstream edges across `backend/src/`, `nextjs/src/`, and `supabase/`.
- **Post-Change Graph Refresh:** After structural code additions or deletions, refresh the knowledge graph with `graphify update .` and inspect integrity diagnostics. Never index `.env*`, `node_modules`, build output (`dist/`, `.next/`), or secrets.

### Rule 3: Ponytail Coding Discipline (Write Code Like a "Lazy Senior Dev")
- **Activate `ponytail` for All Implementation:** All code generation and refactoring MUST adhere strictly to the **Ponytail** skill ruleset:
  1. **Trace the Real Flow First:** Follow the actual execution path across the stack before writing a single line (NestJS request pipeline -> Guards -> Service -> Supabase RPC/DB; Next.js Server Components -> Client Components -> API helpers).
  2. **Smallest Correct Change:** Stop at the smallest, simplest code change that satisfies the failing test and specification. The best code is the code you never had to write.
  3. **Zero Speculative Abstractions:** Do not invent premature base classes, generic wrappers, redundant state managers, unrequested config flags, or "just-in-case" helper utilities.
  4. **Leverage Framework & Platform Standard Features:**
     - Use Web/Node `Intl.DisplayNames` for country name resolution instead of third-party country packages.
     - Use native `app/manifest.ts` and lightweight hand-written `public/sw.js` (~40 lines) instead of bulky Workbox/Serwist bundles.
     - Generate app icons dynamically via `next/og` `ImageResponse` instead of storing static binaries.
     - Use native `@supabase/ssr` cookies session handling.
  5. **Preserve Explicit Safety Floors:** Never strip existing error handling, RFC-7807 problem details, type guards, or security validations during refactoring, and never touch unrelated lines of code in the same diff.

### Rule 4: Zero Raw Secret Leakage & GDPR/DSGVO Privacy Floors
- **Strictly Prohibited:** Never emit or log raw Supabase service-role keys, Supabase JWTs, database credentials, plain-text passwords, or unmasked session tokens to `stdout`, `stderr`, application logs, client responses, or git.
- **Environment Isolation:** Secrets live exclusively in ignored `backend/.env` and `nextjs/.env.local`. Keep `.env.example` templates synchronized without secrets.
- **Audit Logging Standards:** The `public.audit_log` table must store only actor UUID and target UUID (without foreign keys so logs survive user deletion) and structured change diffs. Never store unredacted PII or auth credentials in audit payloads. RLS is enabled with no public policies (service-role only).
- **Anonymized Account Deletion:** Account deletion (self-service or admin) must purge owned storage blobs (`avatars/<auth.uid()>/`), write an audit record, cascade deletion, and scrub attempt payloads via `profiles_scrub_attempts` trigger while preserving anonymous challenge statistics (`accuracy`, `is_validated`).

### Rule 5: Database Authoritative Security & Least Privilege Access
- **Database as Source of Truth:** User role (`developer`, `recruiter`, `admin`) and status (`active`, `suspended`) are determined strictly by `public.profiles` in PostgreSQL. Never trust client-supplied metadata or tamperable JWT claims.
- **Immediate Suspension Enforcement:** `UserGuard`, `AdminGuard`, and `RecruiterGuard` must verify `profiles.status = 'active'` on every request. Suspended users must immediately receive `403 Forbidden` (`account_suspended`), even with an unexpired JWT.
- **Postgres Row-Level Security (RLS):**
  - Direct `UPDATE` on `public.profiles` is revoked from `anon` and `authenticated`. All profile mutations must flow through the NestJS backend (using `service_role`) or security-definer PostgreSQL RPC functions (`admin_set_role`, `admin_set_status`).
  - Base challenge, progress, and recommendation tables have `REVOKE ALL FROM anon, authenticated`.
- **Storage Bucket Security:** The `avatars` bucket enforces a 2 MB size limit, image MIME type whitelist (`image/png`, `image/jpeg`, `image/webp`), and folder-level ownership policies (`avatars/<auth.uid()>/`). Direct client writes outside the user's folder are rejected.

### Rule 6: Mandatory Test-Driven Development (TDD) & Real Verification
- Invoke `/agent-skills:test-driven-development` and `/agent-skills:incremental-implementation` for every task.
- Follow the strict **Red-Green-Refactor** cycle:
  1. **Red:** Write a failing unit or contract test in `backend/src/**/*.spec.ts` or `nextjs/scripts/check-*.mjs`.
  2. **Verify Red:** Run test command and confirm it fails for the expected reason.
  3. **Green (via Ponytail):** Write the minimal implementation code required to make the test pass.
  4. **Verify Green:** Run the test command and confirm it passes.
  5. **Refactor:** Clean up types, DTOs, and docstrings while keeping tests green and diffs minimal.
- **Standard Verification Suite:**
  - Backend Unit/Integration: `npm --prefix backend test`
  - Backend Build: `npm --prefix backend run build`
  - Frontend Automated Auth & Feature Suite: `npm --prefix nextjs run test:auth`
  - Frontend Typecheck: `npx tsc -p nextjs --noEmit`
  - Database SQL Assertions: `supabase/tests/identity.sql` run against dev PostgreSQL.
- Maintain >= 90% test coverage across controllers, services, guards, and shared API helpers.

### Rule 7: Full-Stack Modular Architecture & RFC-7807 Standard
- **Backend Architecture (`backend/`):**
  - NestJS 11 modular structure: `auth/`, `users/`, `messaging/`, `common/`, `supabase/`.
  - All input transfer objects (DTOs) must be validated with `class-validator` and `ValidationPipe` (`whitelist: true, transform: true`).
  - All route IDs must use `ParseUUIDPipe`.
  - Standardized error handling: Global `ProblemDetailsFilter` ensures all HTTP errors return RFC-7807 `application/problem+json` format.
  - OpenAPI/Swagger documentation maintained at `/docs`.
- **Frontend Architecture (`nextjs/`):**
  - Next.js 16.4 App Router conventions. Comply with `nextjs/AGENTS.md` (read Next 16 docs in `node_modules/next/dist/docs/` before altering conventions).
  - Strict separation of Server Components and Client Components (`"use client"`).
  - Session handling: Utilize `@supabase/ssr` cookies session management via `src/lib/supabase/` and proxy middleware (`src/proxy.ts`). No sensitive tokens stored in `localStorage`.
  - Open Redirect Protection: All post-login or post-auth redirects must pass through `safeNext()` sanitization.
- **Database Architecture (`supabase/`):**
  - All schema mutations must be recorded as timestamped, idempotent SQL migration files in `supabase/migrations/`.

### Rule 8: Zero-Billing Cloud & Resilient Local Dev Strategy
- The application is designed to operate 100% on free tiers with zero cloud billing dependencies.
- Dedicated Dev Supabase Project: `devarena-dev` (`qorlygdcfwnrrzvzulcz`), Paris region, $0/month.
- Local and offline-first resilience: automated test scripts fake external network calls and Auth SDK methods so suites pass reliably offline without network latency or external costs.
- Resilient in-memory fallbacks are permitted during rapid iteration if an experimental table is not yet migrated to the dev database.

### Rule 9: Addy Osmani Subagent Pack & Verification Loops
- Never rely on a single monolithic agent thread to both write and approve code. Orchestrate the **`addyosmani/agent-skills` subagent pack** across every phase:
  1. **Ideate & Plan:** Use `/agent-skills:spec-driven-development` and `/agent-skills:planning-and-task-breakdown` to establish criteria before coding.
  2. **Implement (Builder Subagent + Ponytail):** Delegate atomic slices using `/agent-skills:incremental-implementation` paired with the `ponytail` skill.
  3. **Test Verification (`test-engineer` subagent):** Spawn `test-engineer` to verify NestJS controller/service unit tests and Next.js scenario scripts.
  4. **Security Gate (`security-auditor` subagent):** Spawn `security-auditor` to audit PostgreSQL RLS policies, NestJS RBAC guards, SSR cookie flags, open-redirect defenses, and storage bucket security.
  5. **Five-Axis Code Review (`code-reviewer` subagent / `/agent-skills:code-review`):** Spawn `code-reviewer` before completing any `todo.md` task to verify modular boundaries, RFC-7807 compliance, TypeScript strictness, and Ponytail minimal-diff adherence.

### Rule 10: Mandatory Review Receipts (Exit Criteria)
- Every subagent or skill execution must conclude by emitting a structured **Review Receipt** before requesting human approval in the Antigravity Artifact Review (`Ctrl+R`) screen:
  - **Graphify Nodes/Edges Consulted:** Which modules, classes, and relationships were traced.
  - **Files Changed:** Exact list of created/modified files.
  - **Commands Run & Output:** Exact test and lint commands executed (`npm --prefix backend test`, `npm --prefix nextjs run test:auth`, `npx tsc -p nextjs --noEmit`) and their status.
  - **Ponytail Check:** Confirmation that no unrequested abstractions, unnecessary packages, or out-of-scope diffs were introduced.
  - **Open Risks:** Any remaining assumptions, edge cases, or manual browser/hosted checks needed.

### Rule 11: Phase Transition Gate (Run, Human Approval, Git Push)
- Before proceeding to any subsequent phase or checkpoint in [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md):
  1. **Run the Project:** Execute the full test suite (`npm --prefix backend test` and `npm --prefix nextjs run test:auth`) and confirm clean builds to demonstrate complete runtime integrity.
  2. **Ask Human for Approval:** Present the run results and review receipt, and explicitly request human approval before advancing.
  3. **Git Commit & Push:** Once human approval is received, stage all relevant changes, commit with an atomic conventional commit message (`feat(...)`, `fix(...)`, `test(...)`), and push to the remote repository.
  4. **Advance to Next Phase:** Only after git push is confirmed complete may work on the next phase begin.
