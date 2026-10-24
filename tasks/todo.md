# Tasks: `account-availability`

Plan: `tasks/plan.md` · Spec: `SPEC-account-availability.md`

---

## Phase 10 — Demo Account Sign-In & Account Availability Resilience

### T34: Backend CORS Multi-Origin & Profile Contract Hardening
**Description:**
- In `backend/src/main.ts`:
  - Update CORS configuration to permit `http://localhost:3001`, `http://127.0.0.1:3001`, and `process.env.FRONTEND_ORIGIN` with `credentials: true`.
- In `backend/src/users/users.service.ts`:
  - In `getProfile()`: include `status: profile.status` in `UserProfileResponse` return object so it strictly conforms to `AuthUser` contract (`status: 'active' | 'suspended'`).
- In `backend/src/users/users.service.spec.ts`:
  - Add assertions verifying `status: 'active'` is returned by `getProfile()`.
**Acceptance:**
- [x] Backend CORS cleanly accepts preflight and requests from both `localhost:3001` and `127.0.0.1:3001`
- [x] `UserProfileResponse` includes `status` field matching profile status
- [x] Unit tests pass
**Verify:** `npm --prefix backend test` green; `npm --prefix backend run build` green
**Files:** `backend/src/main.ts`, `backend/src/users/users.service.ts`, `backend/src/users/users.service.spec.ts`
**Scope:** S

### T35: Demo Auth Metadata & Role Sync
**Description:**
- In `backend/scripts/seed-roles.mjs`:
  - Ensure `user_metadata` for demo accounts is updated with `{ role: item.role, username: item.username, visibility: item.visibility }`.
  - Run `node backend/scripts/seed-roles.mjs` against Supabase to synchronize demo auth metadata.
- In `nextjs/src/proxy.ts`:
  - Handle missing role claims gracefully so uninitialized metadata does not cause erroneous redirect loops.
**Acceptance:**
- [x] Supabase auth user metadata for demo users contains explicit `role`
- [x] `proxy.ts` edge middleware correctly routes authenticated users to their designated role home
**Verify:** `npm --prefix backend run seed:roles`; `npm --prefix nextjs run test:auth`
**Files:** `backend/scripts/seed-roles.mjs`, `nextjs/src/proxy.ts`
**Scope:** S

### T36: Frontend AccountProvider Resilience & Diagnostic Messaging
**Description:**
- In `nextjs/src/components/AccountProvider.tsx`:
  - Add transient automatic retry: if the initial fetch fails due to network connection refusal / transient timeout, retry once after a short delay (e.g. 500ms) before declaring failure.
  - Diagnostic feedback: differentiate network offline errors (`fetch failed`, `ERR_CONNECTION_REFUSED`) from `account_suspended`, displaying a clear message: `"Unable to connect to backend API server (localhost:3000). Please ensure the backend is running."`
  - Ensure retry button cleanly resets error state and re-executes fetch.
- In `nextjs/src/components/auth/LoginForm.tsx`:
  - Ensure demo login reliably retains `demo.target` destination.
**Acceptance:**
- [x] Network connection drops or delays trigger a quick retry before showing failure
- [x] Network failure message clearly indicates backend unreachable instead of ambiguous "Account unavailable"
- [x] Demo login cleanly navigates to designated role target
**Verify:** `npm --prefix nextjs run test:auth`; `npx tsc -p nextjs --noEmit`
**Files:** `nextjs/src/components/AccountProvider.tsx`, `nextjs/src/components/auth/LoginForm.tsx`
**Scope:** S

### T37: Automated Verification & Integration Suite
**Description:**
- In `nextjs/scripts/check-role-login.mjs`:
  - Add test assertions covering network resilience fallback, CORS host flexibility, and demo account destination integrity.
- Run full verification suite across backend and frontend.
**Acceptance:**
- [x] `npm --prefix backend test` passes (all 18 suites)
- [x] `npm --prefix nextjs run test:auth` passes (all scenarios)
- [x] `npx tsc -p nextjs --noEmit` passes (0 errors)
- [x] Live demo accounts log in and hydrate cleanly
**Verify:** Standard verification commands green
**Files:** `nextjs/scripts/check-role-login.mjs`
**Scope:** S

## ✅ Checkpoint J — account-availability done
- [x] All 4 tasks T34–T37 completed
- [x] Full test suites green (backend + frontend test:auth + typecheck)
- [x] Review receipt emitted per Rule 10
- [x] Human approval granted per Rule 11
- [x] Git Commit & Push executed per Rule 11
