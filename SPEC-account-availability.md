# Spec: Demo Account Sign-In & Account Availability Resilience (`account-availability`)

## 1. Objective
When signing into any of the three demo accounts (`admin@devarena.test`, `recruiter@devarena.test`, `developer@devarena.test`) from the login page, users intermittently or consistently encounter:
> `"Account unavailable. Try again shortly."`

This spec defines the root-cause diagnosis, architectural fixes, and resilience enhancements across the full stack (NestJS backend, Next.js frontend, and Supabase auth/data layers) to ensure seamless, reliable demo account authentication and session hydration.

### Root Causes Identified
1. **Backend Connectivity & Process Decoupling:**
   - Client-side `AccountProvider.tsx` fetches `http://localhost:3000/me/profile` via `NEXT_PUBLIC_API_URL`.
   - When the NestJS backend on port 3000 is not running or is starting up, browser `fetch` throws `TypeError: Failed to fetch` (`ERR_CONNECTION_REFUSED`), causing `AccountProvider` to enter a failure state with the exact string `"Account unavailable. Try again shortly."`.
2. **CORS Host Discrepancy (`localhost` vs `127.0.0.1`):**
   - The backend `app.enableCors` configuration strictly checked against a single origin (`FRONTEND_ORIGIN ?? 'http://localhost:3001'`).
   - If the developer accesses the frontend at `http://127.0.0.1:3001`, preflight `OPTIONS` requests fail CORS validation in modern browsers.
3. **Missing `status` in `UserProfileResponse`:**
   - The `Account` type in `AccountProvider.tsx` extends `AuthUser`, which requires `status: 'active' | 'suspended'`.
   - `UsersService.getProfile()` in the NestJS backend omitted `status` from its returned payload.
4. **Metadata vs Database Role Drift in `proxy.ts`:**
   - `proxy.ts` attempted to inspect `claimsData?.user_metadata?.role` to determine the post-auth landing destination (`/admin/users`, `/recruiter`, `/dashboard`).
   - In Supabase, the demo users had metadata without explicit `role` fields (roles are authoritative in `public.profiles.role`), leading to unexpected redirects to `/dashboard` for non-developers before client-side hydration.
5. **Lack of Resilient Retry in `AccountProvider`:**
   - `AccountProvider` immediately locked into failure on the first failed fetch without transient retry or distinction between network offline errors and permanent authorization errors.

---

## 2. Tech Stack & Commands

### Tech Stack
- **Backend:** NestJS 11, TypeScript, Express, `@supabase/supabase-js` (service-role), `class-validator`
- **Frontend:** Next.js 16.4 (App Router), React 19, `@supabase/ssr` (cookies), Tailwind CSS v4
- **Database/Auth:** Supabase Auth (ES256 JWT, PKCE), PostgreSQL 17

### Commands
- **Backend Tests:** `npm --prefix backend test`
- **Backend Build:** `npm --prefix backend run build`
- **Seed Demo Roles:** `npm --prefix backend run seed:roles`
- **Frontend Auth & RBAC Suite:** `npm --prefix nextjs run test:auth`
- **Frontend Typecheck:** `npx tsc -p nextjs --noEmit`
- **Frontend Build:** `npm --prefix nextjs run build`

---

## 3. Project Structure & Affected Modules

```
backend/
├── src/
│   ├── main.ts                    → Update CORS to permit localhost and 127.0.0.1 origins
│   ├── users/
│   │   ├── users.service.ts       → Include `status: profile.status` in UserProfileResponse
│   │   └── users.service.spec.ts  → Assert `status` presence in returned profile
│   └── scripts/
│       └── seed-roles.mjs         → Sync user_metadata.role with profile.role for demo users
nextjs/
├── src/
│   ├── components/
│   │   ├── AccountProvider.tsx    → Add transient retry, better diagnostics & network error handling
│   │   └── auth/
│   │       └── LoginForm.tsx      → Robust role destination resolution fallback
│   ├── proxy.ts                   → Fallback role resolution when user_metadata.role is empty
│   └── lib/
│       └── role-login.ts          → Ensure demo account targets & destination mappings align
```

---

## 4. Code Style & Standards

Follow Ponytail discipline: smallest correct change, no speculative abstractions, standard platform APIs.

```ts
// Example: Resilient CORS origin resolution in backend/src/main.ts
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

---

## 5. Testing Strategy

1. **Unit & Integration Tests (Backend):**
   - Update `users.service.spec.ts` to assert `status: 'active'` is always returned in `getProfile`.
   - Verify all 18 backend test suites remain green.
2. **Frontend Scenario Tests:**
   - Update `nextjs/scripts/check-role-login.mjs` to test login resolution with and without `user_metadata.role`.
   - Verify all 32 RBAC test assertions pass.
3. **Live Verification Script:**
   - Execute an end-to-end verification script testing `/me` and `/me/profile` for all 3 demo accounts (`admin`, `recruiter`, `developer`) verifying complete payload parity and status codes.

---

## 6. Boundaries

- **Always Do:**
  - Verify PostgreSQL `public.profiles.role` remains the authoritative source of truth (Rule 5).
  - Preserve RFC-7807 Problem Details compliance on all backend errors.
  - Run full backend and frontend test suites before completing checkpoints.
- **Ask First:**
  - Any database schema alterations or Supabase table changes.
- **Never Do:**
  - Never log raw Supabase keys, JWTs, or passwords to `stdout`/`stderr` (Rule 4).
  - Never trust client-side role claims over database profiles for privileged actions.

---

## 7. Success Criteria

1. Clicking "Sign in as Admin" logs in and cleanly navigates to `/admin/users` without any `"Account unavailable. Try again shortly."` banner.
2. Clicking "Sign in as Recruiter" logs in and cleanly navigates to `/recruiter` without any account error banner.
3. Clicking "Sign in as Developer" logs in and cleanly navigates to `/profile` with full technologies and progress rendered.
4. If the backend is momentarily delayed or unreachable, `AccountProvider` attempts an automatic retry before displaying an actionable offline notice.
5. `npm --prefix backend test`, `npm --prefix nextjs run test:auth`, and `npx tsc -p nextjs --noEmit` pass with zero failures.

---

## 8. Open Questions & Assumptions

### Assumptions
1. Both the backend (`npm run start:dev` on port 3000) and frontend (`npm run dev` on port 3001) are expected to run simultaneously during local browser evaluation.
2. Demo accounts use the provisioned credentials in `nextjs/src/lib/role-login.ts` and `backend/scripts/seed-roles.mjs`.

### Questions for You:
1. Would you like `AccountProvider` to display a specific "Backend API is unreachable on localhost:3000" message when network errors occur, rather than the generic "Account unavailable. Try again shortly."?
2. Shall we update `backend/scripts/seed-roles.mjs` to ensure the Supabase `user_metadata` for the demo accounts includes `{ role: item.role }` so that `proxy.ts` server-side edge redirects resolve immediately without needing an API round-trip?
