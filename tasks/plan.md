# Implementation Plan: Developer Invitations, Practice Scoring & Score Visibility

**Specs:** [`SPEC-developer-invitations.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-developer-invitations.md) · [`SPEC-practice-scoring.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-practice-scoring.md) · [`SPEC-user-scores-ui.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-user-scores-ui.md)  
**Capability Map:** [`capability-map-scores-and-invitations.md`](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map-scores-and-invitations.md)  
**Status:** **PROPOSED (Awaiting Human Approval)** · **Checkpoint Gate: Checkpoint L**

---

## 1. Overview & Objectives

1. **Developer Invitations (`developer-invitations`):** Make recruiter outreach visible to developers by adding navigation links, an alert banner on the dashboard, and a clean Accept/Decline interface with live chat redirection.
2. **Practice & Solo Duel Scoring (`practice-scoring`):** Ensure that developer activity from practice challenges and solo DevBot duels records verified attempts and dynamically recalculates skill levels and the overall Median Dev Score.
3. **Score Visibility (`user-scores-ui`):** Replace all outdated arithmetic averages with the authoritative Median Dev Score and Tier badge across the dashboard, profile, and header.

---

## 2. Dependency Graph & Vertical Slices

```
[developer-invitations]
T44: Navigation Links, InvitationsManager Developer View & Dashboard Widget
  │
  ▼
[practice-scoring: Backend]
T45: POST /me/skills/challenges/:id/attempt Endpoint & Unit Tests
  │
  ▼
[practice-scoring: Frontend]
T46: Wire ChallengeModal & Solo DevBot Duel to Attempt Submission
  │
  ▼
[user-scores-ui: Frontend]
T47: Median Dev Score in useSkillSummary, Dashboard Score Card & Profile
  │
  ▼
[Verification Gate]
T48: Full Regression Suites, Typechecks & Review Receipt (Checkpoint L)
```

---

## 3. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Unauthenticated users submitting challenge attempts | High | Guard `POST /me/skills/challenges/:id/attempt` strictly with `UserGuard`, reading `userId` directly from `req.user.id`. |
| Out-of-bounds accuracy values | Med | Clamp `accuracy` strictly between `0.0` and `1.0` in the backend endpoint. |
| Inconsistent median calculation between client and SQL view | Med | Replicate exact PostgreSQL median logic in `useSkillSummary.ts`: sort ascending, pick middle element or average of two middle elements. |

---

## 4. Verification Checkpoint (Checkpoint L)

- Backend Tests: `npm --prefix backend test` (all suites green).
- Backend Build: `npm --prefix backend run build` (0 errors).
- Frontend Auth Suite: `npm --prefix nextjs run test:auth` (all scenarios passing).
- Frontend Typecheck: `npx tsc -p nextjs --noEmit` (0 errors).
- Practice Challenge: Submitting check answer records attempt and emits `ATTEMPT_VALIDATED`.
- Developer Invitations: Accessible from `/invitations` with Accept/Decline working for developers.
- Score Display: Dashboard and Profile render "Dev Score: X · [Tier] Tier".

---

## 5. Phase 20: Recruiter Candidate Invitation Delivery (`invitation-delivery`)

**Spec:** [`SPEC-invitation-delivery.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-invitation-delivery.md)  
**Status:** **PROPOSED (Checkpoint M)**

### Objectives
Replace the placeholder notice in `RecruiterDashboard.tsx` with live invitation dispatching using `sendInvitation(candidate.id, message)` from `@/lib/messaging`.

### Vertical Slice & Tasks
```
[invitation-delivery]
T49: Specification for Candidate Invitation Delivery (SPEC-invitation-delivery.md)
  │
  ▼
T50: Wire sendInvitation in RecruiterDashboard with loading, duplicate handling, & UI feedback
  │
  ▼
T51: Automated Test Assertions in scripts/check-recruiter-candidates.mjs
  │
  ▼
T52: Full Verification Gate & Review Receipt (Checkpoint M)
```

