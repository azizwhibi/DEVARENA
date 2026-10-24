# Implementation Plan: Demo Account Sign-In & Account Availability Resilience (`account-availability`)

Reference Spec: `SPEC-account-availability.md`  
Status: **PROPOSED** · Checkpoint: **Checkpoint J**  

## 1. Overview & Objectives

Resolve the "Account unavailable. Try again shortly." error occurring after logging into demo accounts by hardening backend CORS, ensuring full profile contract compliance, synchronizing demo auth metadata, and enhancing `AccountProvider` network error resilience.

---

## 2. Dependency Graph & Vertical Slices

```
T34 (Backend CORS & Profile Contract Hardening)
  │
  ├──► T35 (Demo Auth Metadata & Role Sync)
  │
  ├──► T36 (Frontend AccountProvider Resilience & Diagnostic Messaging)
  │
  └──► T37 (Automated Verification & Integration Suite)
```

Implementation Order:
1. **T34**: Backend CORS multi-origin support (`localhost:3001` + `127.0.0.1:3001`) and `status` field in `UserProfileResponse`.
2. **T35**: Demo user metadata sync (`user_metadata.role`) in `seed-roles.mjs` and edge proxy fallback in `proxy.ts`.
3. **T36**: Frontend `AccountProvider` transient retry, actionable network error diagnosis, and `LoginForm` preferred target validation.
4. **T37**: Automated test updates in `check-role-login.mjs` and full verification gate.

---

## 3. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Permissive CORS allows unauthorized origins | Med | Whitelist strictly to `localhost:3001`, `127.0.0.1:3001`, and configured `FRONTEND_ORIGIN`. |
| User metadata spoofing | Low | Database `public.profiles.role` remains authoritative in all backend guards (Rule 5). |
| Endless retry loops in `AccountProvider` | Low | Limit transient automatic retries to 1 attempt before falling back to manual retry. |

---

## 4. Verification Checkpoint (Checkpoint J)

- Backend Tests: `npm --prefix backend test` (18 suites passing).
- Backend Build: `npm --prefix backend run build` (clean build).
- Frontend Auth Suite: `npm --prefix nextjs run test:auth` (all scenarios passing).
- Frontend Typecheck: `npx tsc -p nextjs --noEmit` (0 errors).
- Live Demo Verification: Verify all 3 demo accounts (`admin`, `recruiter`, `developer`) authenticate and hydrate cleanly without errors.
