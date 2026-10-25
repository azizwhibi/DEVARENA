# Tasks: `role-workflows`

Plan: `tasks/plan.md` · Spec: `SPEC-role-workflows.md`

---

## Phase 9 — Role-Specific Workflows & Boundaries

### T30: Backend Role-Based Profile & Guard Isolation
**Description:**
- In `backend/src/users/users.service.ts`:
  - `getProfile`: for non-developers (`role !== 'developer'`), return `technologies: []`, `devScore: null`, `tier: null`.
  - `updateProfile`: if caller's role is not `'developer'`, ignore `technologyIds` so non-developers cannot associate technologies.
- In `backend/src/auth/guards.ts`:
  - Add `DeveloperGuard` requiring `req.user?.role === 'developer'`.
- In `backend/src/skills/assignments.controller.ts`:
  - Enforce `DeveloperGuard` on `PracticeDirectoryController` (`/skill-challenges`) so recruiters cannot fetch or pass practice challenges.
**Acceptance:**
- [x] Non-developer profile returns empty technologies array and null devScore/tier
- [x] Recruiter cannot fetch practice challenges (`/skill-challenges` returns 403 Forbidden)
- [x] Developer profile retains technologies and access
**Verify:** `npm --prefix backend test` green; `npm --prefix backend run build` green
**Files:** `backend/src/users/users.service.ts`, `backend/src/users/users.service.spec.ts`, `backend/src/auth/guards.ts`, `backend/src/auth/guards.spec.ts`, `backend/src/skills/assignments.controller.ts`
**Scope:** S

### T31: Role-Specific Application Shell & Navigation
**Description:**
- In `nextjs/src/components/skills/SkillsWorkspace.tsx`:
  - If `account?.role === 'admin'`: show ONLY `administration` links (`/admin/users`, `/admin/skills`, `/admin/skill-associations`, `/admin/knowledge`, `/admin/marketplace`). Hide developer links.
  - If `account?.role === 'recruiter'`: show ONLY `recruiter` links (`/recruiter` Candidate Hub, `/invitations` Interview Requests, `/messages` Live Messages). Hide developer and admin links.
  - If `account?.role === 'developer'`: show developer `navigation` links (`/dashboard`, `/my-skills`, `/discover`, `/arena`, `/knowledge`, `/marketplace`, `/duel`).
- In `nextjs/src/components/AuthHeader.tsx`:
  - Brand link routes to role-specific destination: Admin → `/admin/users`, Recruiter → `/recruiter`, Developer → `/dashboard`.
- In `nextjs/src/components/ApplicationShell.tsx`:
  - Add `/invitations` and `/messages` to `workspace` routes so recruiter keeps workspace shell.
- In `nextjs/src/lib/role-login.ts`:
  - Update `resolveRoleDestination` and demo accounts.
**Acceptance:**
- [x] Admin sidebar contains only the 5 admin links
- [x] Recruiter sidebar contains only Candidate Hub, Invitations, Messages
- [x] Developer sidebar contains only developer links
- [x] Brand link navigates to correct role home
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/skills/SkillsWorkspace.tsx`, `nextjs/src/components/AuthHeader.tsx`, `nextjs/src/components/ApplicationShell.tsx`, `nextjs/src/lib/role-login.ts`
**Scope:** S

### T32: Profile & Settings Role Isolation
**Description:**
- In `nextjs/src/components/profile/ProfileHeader.tsx`:
  - When `profile.role !== 'developer'`:
    - Do not render `technologies` chips, `EquippedBadge`, `Customize` button, or `devScore`/`tier`.
    - Do not render `<ProfileProgress />` (radar chart, Developer DNA, proficiency metrics).
  - When `profile.role === 'recruiter'`:
    - Render a clean Recruiter Activity card with quick actions: Candidate Hub, Invitations, Messages.
  - When `profile.role === 'admin'`:
    - Render an Admin Management card with quick actions: User Moderation, Skills Management, Knowledge Resources.
- In `nextjs/src/components/profile/ProfileForm.tsx`:
  - When `profile.role !== 'developer'`:
    - Hide the "Skills & Technologies" section (no technology picker chips, no counter).
**Acceptance:**
- [x] Admin /profile and /profile/settings show 0 skills and 0 technologies
- [x] Recruiter /profile and /profile/settings show 0 skills and 0 technologies; shows recruiter quick actions
- [x] Developer /profile retains full radar chart, technologies, badges, and progress
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/profile/ProfileHeader.tsx`, `nextjs/src/components/profile/ProfileForm.tsx`
**Scope:** S

### T33: Route Access Control & Challenge Enforcement
**Description:**
- In `nextjs/src/app/(skills)/arena/page.tsx` & `page-client.tsx`:
  - Non-developers (recruiter, admin) are redirected to their role home (`/recruiter` or `/admin/users`).
- In `nextjs/src/app/(skills)/duel/page.tsx`:
  - Non-developers are redirected to their role home.
- In `nextjs/src/app/(skills)/dashboard/page.tsx` & `page-client.tsx`:
  - Admin is redirected to `/admin/users`; recruiter is redirected to `/recruiter`.
- In `nextjs/src/app/(skills)/my-skills/page.tsx` & `discover/page.tsx`:
  - Non-developers are redirected to their role home.
- In `nextjs/src/proxy.ts`:
  - Default authed destination routes to `resolveRoleDestination`.
- Automated test scripts:
  - Add comprehensive test assertions in `nextjs/scripts/check-role-login.mjs` and `nextjs/scripts/check-profile.mjs`.
**Acceptance:**
- [x] Recruiter visiting `/arena` or `/duel` or `/dashboard` is redirected to `/recruiter`
- [x] Admin visiting `/arena` or `/duel` or `/dashboard` is redirected to `/admin/users`
- [x] Automated auth & RBAC test suite passes completely
**Verify:** `npm --prefix backend test`; `npm --prefix nextjs run test:auth`; `npm --prefix nextjs run build`
**Files:** `nextjs/src/app/(skills)/arena/page.tsx`, `nextjs/src/app/(skills)/duel/page.tsx`, `nextjs/src/app/(skills)/dashboard/page.tsx`, `nextjs/src/proxy.ts`, `nextjs/scripts/check-role-login.mjs`, `nextjs/scripts/check-profile.mjs`
**Scope:** M

## ✅ Checkpoint I — role-workflows done
- [x] All 4 tasks T30–T33 completed
- [x] Full test suites green (backend 231 tests + frontend test:auth 32 RBAC assertions + frontend build 37 routes)
- [x] Review receipt emitted per Rule 10
- [x] Human approval granted per Rule 11
- [x] Git Commit & Push executed per Rule 11
