# Spec: `invitation-delivery` — Recruiter Candidate Invitation Delivery

**Module ID:** `invitation-delivery`  
**Depends on:** `developer-invitations` (completed in Checkpoint L)

---

## 1. Objective

Replace the placeholder message in [`nextjs/src/components/recruiter/RecruiterDashboard.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/recruiter/RecruiterDashboard.tsx) (`"Selected @... Invitation delivery is not available yet."`) with functional, real-time invitation dispatching. When a recruiter or admin clicks to contact/invite an active developer from the Candidate Hub, the application must:
1. Call the authenticated backend API `POST /recruiter/invitations` via `sendInvitation(candidate.id, message)` from [`nextjs/src/lib/messaging.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/lib/messaging.ts).
2. Display instant UI feedback indicating the invitation was dispatched, with a direct link to view and track sent requests (`/invitations`).
3. Reflect invitation status directly on the candidate card (e.g. "Invited" / "Pending response").
4. Handle edge cases cleanly: duplicate invitation detection (HTTP 409 `invitation_duplicate`), network failures, and inactive candidates.
5. Notify the developer in real-time via the existing WebSocket gateway (`invitation_received`).

### Who benefits
- **Recruiters & Admins:** Can actually reach out to developers found in the Candidate Hub.
- **Developers:** Receive real interview requests on their dashboard (`/dashboard`) and invitations page (`/invitations`).

---

## 2. Tech Stack & Commands

- **Backend:** NestJS 11, `@nestjs/swagger`, `InvitationsController`, `InvitationsService`, WebSocket Gateway.
- **Frontend:** Next.js 16.4, React 19, TypeScript strict mode, Tailwind CSS tokens.
- **Commands:**
  - Build Backend: `npm --prefix backend run build`
  - Test Backend: `npm --prefix backend test -- invitations`
  - Build Frontend: `npm --prefix nextjs run build`
  - Test Frontend: `npm --prefix nextjs run test:auth`
  - Typecheck Frontend: `npx tsc -p nextjs --noEmit`

---

## 3. Project Structure

```
backend/src/messaging/
├── invitations.controller.ts     # POST /recruiter/invitations, GET /recruiter/invitations
├── invitations.service.ts        # createInvitation, memory and db persistence, WS notification
nextjs/src/
├── components/recruiter/
│   └── RecruiterDashboard.tsx    # Candidate Hub UI, replaces placeholder with live invitation dispatch
├── components/invitations/
│   └── InvitationsManager.tsx    # Received and sent invitation tabs with accept/decline/chat links
└── lib/
    ├── candidates.ts             # Candidate query and filter helpers
    └── messaging.ts              # sendInvitation, listSentInvitations, listReceivedInvitations
```

---

## 4. Code Style & Implementation Details

### Client Action in `RecruiterDashboard.tsx`

```typescript
const [invitingId, setInvitingId] = useState<string | null>(null);

const handleInvite = async (candidate: CandidateItem) => {
  setInvitingId(candidate.id);
  setContactNotice(null);
  setError(null);
  try {
    await sendInvitation(
      candidate.id,
      `Hello @${candidate.username}, we discovered your profile on DevArena and would like to invite you for an interview.`,
    );
    setContactedCandidates((prev) => ({ ...prev, [candidate.id]: true }));
    setContactNotice(
      `Invitation sent to @${candidate.username}! Track status in Interview Requests.`,
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invitation-sent'));
    }
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      setContactedCandidates((prev) => ({ ...prev, [candidate.id]: true }));
      setContactNotice(`An active invitation already exists for @${candidate.username}.`);
    } else {
      setError(err instanceof Error ? err.message : 'Could not deliver invitation. Please retry.');
    }
  } finally {
    setInvitingId(null);
  }
};
```

---

## 5. Testing Strategy

1. **Automated Unit & Scenario Tests (`scripts/check-recruiter-candidates.mjs`):**
   - Verify `RecruiterDashboard.tsx` imports and uses `sendInvitation` from `@/lib/messaging`.
   - Verify placeholder string `"Invitation delivery is not available yet"` is 100% eradicated.
   - Assert GDPR Rule 4 compliance: zero unredacted PII (email, tokens).
2. **Backend Unit Tests (`backend/src/messaging/invitations.service.spec.ts`):**
   - Verify `createInvitation()` persists invitation, prevents self-invitation, detects duplicates, and emits WebSocket event.
3. **End-to-End Typecheck:**
   - `npx tsc -p nextjs --noEmit` and `npx tsc -p backend --noEmit` return 0 errors.

---

## 6. Boundaries

- **Always:**
  - Authenticate recruiter requests with `RecruiterGuard`.
  - Preserve database Authoritative Security & Least Privilege Access (Rule 5).
  - Use `sendInvitation` helper from `@/lib/messaging` without inventing redundant API wrappers (Rule 3).
- **Ask first:**
  - Altering database schema or table foreign keys.
- **Never:**
  - Leave placeholder or mock stub text claiming features are unavailable.
  - Expose developer emails or private contact information to recruiters (GDPR Rule 4).

---

## 7. Success Criteria

- [ ] Recruiter clicking candidate button executes live `sendInvitation` request to backend.
- [ ] No occurrences of `"Invitation delivery is not available yet"` remain in the codebase.
- [ ] Positive confirmation banner appears informing recruiter of successful invitation dispatch.
- [ ] Candidate card updates to "Invited" state and prevents duplicate requests.
- [ ] The invited developer sees the invitation appear in their Dashboard alert and `/invitations` inbox.
- [ ] All unit, frontend auth, and typecheck suites pass.
