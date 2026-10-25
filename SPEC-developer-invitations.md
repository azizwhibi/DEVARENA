# Spec: `developer-invitations` — Recruiter Invitations for Developers

**Module ID:** `developer-invitations` (from [capability-map-scores-and-invitations.md](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map-scores-and-invitations.md))  
**Depends on:** — (standalone)

---

## Objective

Ensure developers have full access to view, inspect, accept, and decline interview requests sent by recruiters. Currently, the `/invitations` link and live messaging features are gated in the navigation to recruiters only, preventing developers from seeing or responding to recruiter outreach.

### Who benefits
- **Developers** can see which recruiters want to interview them, read customized messages, and accept or decline opportunities.
- **Recruiters** get prompt responses to their invitations and can start real-time WebSocket chats once accepted.

### Success looks like
- A developer logs in and sees "Interview requests" and "Messages" in their account dropdown and on their dashboard.
- If a recruiter has sent an invitation, a clear notification card appears on `/dashboard`.
- Visiting `/invitations` shows all incoming invitations with recruiter details (username, company/institution, initial message, status).
- Clicking "Accept" updates the status to `accepted` and provides a direct button to open the live chat workspace.
- Clicking "Decline" updates the status to `declined` with feedback.

---

## Tech Stack

- **Frontend:** Next.js 16.4 App Router, React 19, TypeScript
- **Backend APIs:** Existing `InvitationsController` (`GET /invitations`, `PATCH /invitations/:id/accept`, `PATCH /invitations/:id/decline`)
- **Real-time:** `useWebSocketChat` custom events (`invitation-received`)

## Commands

```
Build:     npm --prefix nextjs run build
Test:      npm --prefix nextjs run test:auth
Typecheck: npx tsc -p nextjs --noEmit
```

## Detailed Changes

### 1. Navigation Access in `AuthHeader.tsx`

**File:** [`nextjs/src/components/AuthHeader.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/AuthHeader.tsx)

- Add links in the account dropdown for developers (`account?.role === 'developer'`):
  - `<Link href="/invitations"><WorkspaceIcon name="links" />Interview requests</Link>`
  - `<Link href="/messages"><WorkspaceIcon name="chat" />Messages</Link>`
- Add an invitation indicator badge if pending requests exist.

### 2. Developer View in `InvitationsManager.tsx`

**File:** [`nextjs/src/components/invitations/InvitationsManager.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/invitations/InvitationsManager.tsx)

- For developers (`role === 'developer'`), default the view to `received` invitations tab.
- Display recruiter username, avatar, date received, and custom outreach message.
- "Accept" action triggers `acceptInvitation(id)` and shows a link to `/messages?conversationId=...`.
- "Decline" action triggers `declineInvitation(id)`.

### 3. Dashboard Widget in `dashboard/page-client.tsx`

**File:** [`nextjs/src/app/(skills)/dashboard/page-client.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/app/(skills)/dashboard/page-client.tsx)

- Query `listReceivedInvitations()` on mount.
- If pending invitations exist (`status === 'pending'`), render a prominent "Recruiter Invitations" alert card:
  - Shows count of pending requests and the most recent recruiter's message.
  - Includes a direct button "Review requests" linking to `/invitations`.

---

## Testing Strategy

- Automated scenarios in `nextjs/scripts/check-recruiter-invitations-chat.mjs` / `check-role-login.mjs` verifying:
  - Developer role can fetch received invitations.
  - Acceptance creates a conversation and updates status.
- Next.js typecheck: `npx tsc -p nextjs --noEmit`.

---

## Boundaries

- **Always:**
  - Verify caller is authorized via session token before accepting/declining.
  - Preserve optimistic updates with rollback on error.
- **Never:**
  - Expose recruiters' private emails in client responses (display username/institution only).
