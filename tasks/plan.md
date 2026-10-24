# Implementation Plan: Role-Specific Workflows & Profile Boundaries (`role-workflows`)

Reference Spec: `SPEC-role-workflows.md`  
Status: **APPROVED BY USER** · Checkpoint: **Checkpoint I**  

## 1. Overview & Objectives

Enforce role-specific workflows, navigation, and profile boundaries:
- **Admin**: Only sees and accesses admin workflows (`/admin/users`, `/admin/skills`, `/admin/skill-associations`, `/admin/knowledge`, `/admin/marketplace`). Profile & settings have zero skills or technologies.
- **Recruiter**: Only sees and accesses recruiter workflows (`/recruiter`, `/invitations`, `/messages`). Recruiter does not have technologies and does not play or pass challenges. Profile & settings have zero skills or technologies.
- **Developer**: Retains full coding arena, challenges, skills progress, technologies specialization, and radar charts.

---

## 2. Dependency Graph & Vertical Slices

```
T30 (Backend Role-Based Profile & Guard Isolation)
  │
  ├──► T31 (Role-Specific Application Shell & Navigation)
  │
  ├──► T32 (Profile & Settings Role Isolation)
  │
  └──► T33 (Route Access Control & Challenge Enforcement)
```

Implementation Order:
1. **T30**: Backend profile data contract & guard enforcement.
2. **T31**: Frontend shell navigation (`SkillsWorkspace.tsx`, `AuthHeader.tsx`, `ApplicationShell.tsx`, `role-login.ts`).
3. **T32**: Frontend profile presentation & settings (`ProfileHeader.tsx`, `ProfileForm.tsx`).
4. **T33**: Route gates & challenge redirects (`/arena`, `/duel`, `/dashboard`, `proxy.ts`, test scripts).

---

## 3. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing developers lose skills or technologies | High | Explicit check: `profile.role === 'developer'` preserves all technologies, radar charts, and dev score progression. |
| Recruiter enters challenge via direct link | Med | Page-level check in `/arena` and `/duel` redirects non-developers to `/recruiter`; backend `/skill-challenges` enforces role. |
| Admin enters dashboard via direct link | Low | Server-side / client-side check redirects admin to `/admin/users`. |
| Hydration mismatch on role-dependent navigation | Low | `useAccount()` already provides authenticated state after hydration; Server Components pass role to initial renders. |

---

## 4. Verification Checkpoint (Checkpoint I)

- Backend: `npm --prefix backend test` (all 226+ tests pass).
- Frontend Auth & RBAC: `npm --prefix nextjs run test:auth` (all test scripts pass).
- Frontend Build & Typecheck: `npx tsc -p nextjs --noEmit && npm --prefix nextjs run build`.
- Review Receipt emitted per Rule 10 before requesting human approval per Rule 11.
