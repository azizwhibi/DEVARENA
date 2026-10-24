# Spec: `role-workflows` — Role-Specific Workflows & Profile Boundaries

Module id: `role-workflows` · Status: **DRAFT FOR REVIEW**

## Objective

Enforce strict role-based workflow boundaries across DevArena for the three user roles (**Developer**, **Recruiter**, and **Admin**):
1. **Admin Workflows**: Admin users must only see and access admin-related workflows (`/admin/users`, `/admin/skills`, `/admin/skill-associations`, `/admin/knowledge`, `/admin/marketplace`, `/admin`). Admin navigation must not display developer arena links (`/dashboard`, `/my-skills`, `/arena`, `/duel`, `/marketplace`, `/discover`). Admin profile (`/profile`) and settings (`/profile/settings`) must not contain skills, radar charts, badges, dev scores, or technology selectors.
2. **Recruiter Workflows**: Recruiter users must only see and access recruiter-related workflows (Candidate Hub `/recruiter`, Interview Requests `/invitations`, Live Messages `/messages`). Recruiters do not have technologies, do not play or pass challenges, and only search for candidates and contact them. Recruiter profile and settings must not contain skills, radar charts, challenge performance, or technology selection.
3. **Developer Workflows**: Developer users retain full coding arena, challenge practice, skill assessments, technology specialization, radar charts, and dev score progression. Developers are forbidden from accessing admin tools (`/admin/*`) or recruiter candidate management (`/recruiter`).

---

## Tech Stack & Dependencies

- **Frontend**: Next.js 16.4 (App Router), React 19, Tailwind CSS v4, `@supabase/ssr` cookies session.
- **Backend**: NestJS 11, TypeScript, `@supabase/supabase-js`, class-validator, RFC-7807 problem details.
- **Database**: PostgreSQL 17.11 (Supabase `devarena-dev`), Row-Level Security, RPC functions.

---

## Commands

- **Backend Unit & Integration Tests**: `npm --prefix backend test`
- **Backend Build**: `npm --prefix backend run build`
- **Frontend Auth & RBAC Tests**: `npm --prefix nextjs run test:auth`
- **Frontend Typecheck**: `npx tsc -p nextjs --noEmit`
- **Frontend Build**: `npm --prefix nextjs run build`

---

## Project Structure & Touched Boundaries

```
backend/
  src/
    auth/
      guards.ts                  → Add DeveloperGuard (or role checks on developer-exclusive endpoints)
      guards.spec.ts             → Unit tests for DeveloperGuard and role authorization matrix
    users/
      users.service.ts           → Filter out technologies for non-developer roles on GET /me/profile and PATCH /me/profile
      users.service.spec.ts      → Unit tests ensuring admin/recruiter profile has no technologies
nextjs/
  src/
    app/
      (skills)/
        arena/page.tsx           → Access control: reject/redirect non-developers
        duel/page.tsx            → Access control: reject/redirect non-developers
        dashboard/page.tsx       → Access control: redirect admin to /admin/users and recruiter to /recruiter
        my-skills/page.tsx       → Access control: reject/redirect non-developers
        discover/page.tsx        → Access control: reject/redirect non-developers
      profile/
        page.tsx                 → Pass role to ProfileHeader
        settings/page.tsx        → Pass role or hide technologies section for non-developers
    components/
      skills/
        SkillsWorkspace.tsx      → Role-specific navigation groups:
                                   - Developer: Dashboard, Skills, Technologies, Challenges, Knowledge, Marketplace, Battle Code
                                   - Admin: Users, Skill Management, Associations, Resources, Marketplace
                                   - Recruiter: Candidate Hub, Invitations, Messages
      AuthHeader.tsx             → Dynamic brand link based on role (/admin/users, /recruiter, /dashboard)
      profile/
        ProfileHeader.tsx        → Conditionally omit technologies, badges, customize button, and ProfileProgress for admin/recruiter;
                                   render recruiter-specific summary on recruiter profile
        ProfileProgress.tsx      → Only render for developers
        ProfileForm.tsx          → Conditionally hide "Skills & Technologies" picker when role is admin or recruiter
    lib/
      role-login.ts              → Dynamic destinations (/admin/users, /recruiter, /dashboard)
  scripts/
    check-role-login.mjs         → Expanded automated test suite for role-based navigation and guard assertions
```

---

## Detailed Specifications by Role

### 1. Admin Role
- **Workflows & Navigation**:
  - Sidebar displays **only** Administration links:
    - Users (`/admin/users`, icon `users`)
    - Skill Management (`/admin/skills`, icon `layers`)
    - Associations (`/admin/skill-associations`, icon `links`)
    - Resources / Knowledge (`/admin/knowledge`, icon `knowledge`)
    - Marketplace (`/admin/marketplace`, icon `marketplace`)
  - No developer navigation items shown (no Dashboard, Skills, Challenges, Battle Code, etc.).
  - Default redirect on login or clicking the logo: `/admin/users`.
  - Attempting to visit `/arena`, `/duel`, `/my-skills`, `/discover`, or `/dashboard`: redirected to `/admin/users`.
- **Profile (`/profile`)**:
  - Displays: Avatar, username, `admin` role badge, visibility, country, institution, bio.
  - Omitted: Technologies chips, Dev Score, Tier, EquippedBadge, Customize button, and `ProfileProgress` (Radar chart, Developer DNA, measured skills).
- **Profile Settings (`/profile/settings`)**:
  - Displays: Avatar upload, username, bio, country, institution, visibility toggle, danger zone.
  - Omitted: "Skills & Technologies" picker (admins do not select technologies).
- **Backend**:
  - `GET /me/profile`: returns `technologies: []`, `devScore: null`, `tier: null` for admin.
  - `PATCH /me/profile`: ignores or strips `technologyIds` for admin (admin profile never has linked technologies).

### 2. Recruiter Role
- **Workflows & Navigation**:
  - Sidebar displays **only** Recruiter links:
    - Candidate Hub (`/recruiter`, icon `users`)
    - Interview Requests (`/invitations`, icon `links` or `mail`)
    - Live Messages (`/messages`, icon `chat`)
  - No developer navigation items shown (no Dashboard, Skills, Challenges, Battle Code, etc.).
  - No admin navigation items shown.
  - Default redirect on login or clicking the logo: `/recruiter`.
  - Attempting to visit `/arena`, `/duel`, `/my-skills`, `/discover`, or `/dashboard`: redirected to `/recruiter`.
- **Profile (`/profile`)**:
  - Displays: Avatar, username, `recruiter` role badge, visibility, country, institution (company/organization), bio.
  - Recruiter-specific summary: Quick links to Candidate Hub, contact actions, or talent activity summary.
  - Omitted: Technologies chips, Dev Score, Tier, EquippedBadge, Customize button, and `ProfileProgress` (Radar chart, Developer DNA, measured skills).
- **Profile Settings (`/profile/settings`)**:
  - Displays: Avatar upload, username, bio, country, institution (company/organization), visibility toggle, danger zone.
  - Omitted: "Skills & Technologies" picker (recruiters do not have technologies; they only search candidates who have them).
- **Backend & Challenges Enforcement**:
  - `GET /me/profile`: returns `technologies: []`, `devScore: null`, `tier: null` for recruiter.
  - `PATCH /me/profile`: ignores or strips `technologyIds` for recruiter.
  - Challenge/Practice routes (`/skill-challenges`, `/me/skills`): non-developers (recruiters) receive `403 Forbidden` (`developer_required`) or cannot submit attempts / participate in duels ("the recruiter doesnt play or pass challenges").

### 3. Developer Role
- Retains full access to Developer Arena:
  - Sidebar: Dashboard (`/dashboard`), Skills (`/my-skills`), Technologies (`/discover`), Challenges (`/arena`), Knowledge (`/knowledge`), Marketplace (`/marketplace`), Battle Code (`/duel`).
  - Profile: Includes technologies chips, Dev Score, Tier, EquippedBadge, and `ProfileProgress` (Radar chart, Developer DNA, skill metrics).
  - Profile Settings: Full "Skills & Technologies" multi-select picker (up to 20 technologies).
  - Default landing: `/dashboard`.

---

## Code Style & Conventions

- Follow the **Ponytail** ruleset: smallest correct change, standard library features first, zero speculative abstractions, preserve safety floors.
- React components: explicit `"use client"` vs Server Components.
- Accessible ARIA labels and keyboard navigation preserved.
- NestJS DTOs and guards strictly typed; errors return RFC-7807 problem details.

---

## Testing Strategy

1. **Backend Unit Tests** (`backend/src/users/users.service.spec.ts` & `backend/src/auth/guards.spec.ts`):
   - Assert `getProfile` for admin and recruiter returns empty `technologies: []`, `devScore: null`, `tier: null`.
   - Assert `updateProfile` for admin or recruiter ignores `technologyIds` and does not insert join rows.
   - Assert developer challenge routes reject non-developers (`RecruiterGuard` / `DeveloperGuard`).
2. **Frontend RBAC Automation** (`nextjs/scripts/check-role-login.mjs` & `nextjs/scripts/check-profile.mjs`):
   - Verify sidebar navigation items for all 3 roles:
     - Admin: strictly admin links, 0 developer links.
     - Recruiter: strictly recruiter links (candidate hub, invitations, messages), 0 developer links.
     - Developer: strictly developer links.
   - Verify profile rendering logic:
     - Admin/recruiter profile has no radar chart, no technology chips, no dev score.
     - Settings has no technology selector for admin/recruiter.
   - Verify redirection:
     - Recruiter visiting `/arena` or `/dashboard` redirects to `/recruiter`.
     - Admin visiting `/arena` or `/dashboard` redirects to `/admin/users`.
3. **Regression Suite**:
   - `npm --prefix backend test` (all existing 226 tests + new tests pass).
   - `npm --prefix nextjs run test:auth` (all auth & RBAC scenarios pass).
   - `npm --prefix nextjs run build` (clean build, 0 type errors).

---

## Boundaries

- **Always do**:
  - Run existing and new tests before requesting review.
  - Keep RFC-7807 problem details on backend HTTP errors.
  - Maintain SSR cookie session safety and open-redirect sanitization (`safeNext`).
- **Ask first**:
  - Database schema table drops or alterations (we avoid schema changes here by handling role projection in application code and existing RPC).
  - Adding new npm packages (not needed; native standard features suffice).
- **Never do**:
  - Expose developer challenge solving or practice to recruiters.
  - Display skills radar chart or technologies on admin or recruiter profiles.
  - Hardcode sensitive credentials or log tokens.

---

## Success Criteria

1. **Admin Navigation Isolation**: When logged in as Admin, the sidebar shows only Administration items (`/admin/users`, `/admin/skills`, `/admin/skill-associations`, `/admin/knowledge`, `/admin/marketplace`). No developer links exist.
2. **Admin Profile Cleanliness**: Admin `/profile` and `/profile/settings` show no skills, no technologies, and no radar chart.
3. **Recruiter Navigation Isolation**: When logged in as Recruiter, the sidebar shows only Candidate Hub (`/recruiter`), Invitations (`/invitations`), and Messages (`/messages`). No developer links exist.
4. **Recruiter No Technologies**: Recruiter `/profile` and `/profile/settings` show no technologies and no skills. `GET /me/profile` returns `technologies: []` for recruiter.
5. **Recruiter No Challenges**: Recruiter cannot access `/arena` or `/duel`, and cannot pass or submit challenges. Attempting navigation redirects to `/recruiter`.
6. **Role Landing Isolation**: Admin lands on `/admin/users` on sign in; Recruiter lands on `/recruiter` on sign in; Developer lands on `/dashboard`.
7. **Automated Verification**: Backend test suite (`npm --prefix backend test`) and frontend suite (`npm --prefix nextjs run test:auth`) pass 100% with dedicated assertions covering all 3 roles.

---

## Open Questions for Clarification

1. **Candidate Contacting Workflow for Recruiter**: Currently, recruiters can view candidates on `/recruiter`, and there are `/invitations` and `/messages` pages. Is linking `/recruiter` (Candidate Hub), `/invitations` (Interview Requests), and `/messages` (Live Messages) in the recruiter sidebar exactly the desired candidate search and contact workflow?
2. **Accessing Developer Routes as Admin/Recruiter**: When an admin or recruiter navigates directly to a developer URL (e.g., `/arena` or `/dashboard`): should they be automatically redirected to their role's home page (`/admin/users` for Admin, `/recruiter` for Recruiter), or should an unauthorized error card be displayed? (Recommendation: Automatic redirect to their role home page, with an optional banner if needed).
