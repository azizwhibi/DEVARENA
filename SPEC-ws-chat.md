# Spec: `ws-chat` — WebSocket Chat Fix (Recruiter ↔ Developer)

**Module ID:** `ws-chat` (from [capability-map.md](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map.md))  
**Depends on:** — (standalone, no dependency on `scoring`)

---

## Objective

Fix the recruiter ↔ developer real-time chat system which is **completely non-functional** because `MessagingModule` is not imported in `AppModule`. The module exists, is fully implemented, but is dead code at runtime.

### Root cause

[`app.module.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/app.module.ts#L14-L26) does not import `MessagingModule`. As a result:
- `MessagingGateway` (WebSocket on `/ws`) is never bootstrapped
- `MessagingController` (REST `/conversations/*`) is never registered
- `InvitationsController` (REST `/invitations/*`) is never registered
- All recruiter ↔ developer messaging is dead

### What exists and works (once wired)

| Component | File | Status |
|---|---|---|
| `MessagingModule` | [`messaging.module.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/messaging/messaging.module.ts) | ✅ Complete, not imported |
| `MessagingGateway` | [`messaging.gateway.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/messaging/messaging.gateway.ts) | ✅ Complete — native `ws`, auth via token, handles `send_message` + `typing` |
| `MessagingService` | [`messaging.service.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/messaging/messaging.service.ts) | ✅ Complete — dual Supabase + in-memory storage |
| `InvitationsService` | `invitations.service.ts` | ✅ Complete |
| `InvitationsController` | `invitations.controller.ts` | ✅ Complete |
| `MessagingController` | `messaging.controller.ts` | ✅ Complete |
| Frontend `useWebSocketChat` | [`useWebSocketChat.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/hooks/useWebSocketChat.ts) | ✅ Complete |
| Frontend `ChatWorkspace` | [`ChatWorkspace.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/chat/ChatWorkspace.tsx) | ✅ Complete |
| DB tables | [`20261020000002_recruiter_invitations_and_messages.sql`](file:///D:/5SIM4/PWA/app/DEVARENA/supabase/migrations/20261020000002_recruiter_invitations_and_messages.sql) | ✅ Applied |

### Who benefits
- **Recruiters** can message developers they're interested in
- **Developers** can respond to recruiter messages in real-time

### Success looks like
- A recruiter sends an invitation → it's accepted → both parties can exchange messages in real-time via WebSocket
- Messages persist in the `messages` table across server restarts
- The `DuelGateway` on `/duel` continues to work without interference

---

## Tech Stack

- **Backend:** NestJS 11, `ws` ^8.22 (native WebSocket, already a dependency)
- **Database:** Supabase PostgreSQL 17.11 (tables already migrated)
- **Frontend:** Next.js 16.4 (hooks and components already built)

## Commands

```
Build:     npm --prefix backend run build
Test:      npm --prefix backend test
Lint:      npm --prefix backend run lint
Typecheck: npx tsc -p backend --noEmit
FE Build:  npm --prefix nextjs run build
```

## Detailed Changes

### W1. Import `MessagingModule` in `AppModule` (THE FIX)

**File:** [`app.module.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/app.module.ts)

**Change:** Add one import line and one array entry:

```typescript
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    // ... existing imports ...
    MessagingModule,  // ← THIS IS THE FIX
  ],
})
```

**Why this is sufficient:**
- `MessagingModule` already imports `AuthModule` and `SupabaseModule`
- `MessagingGateway` implements `OnApplicationBootstrap` and self-registers on the HTTP server's `upgrade` event for `/ws` and `/ws/chat` paths
- `DuelGateway` only handles `/duel` upgrades and returns early for other paths — no conflict
- Both gateways use `noServer: true` with path-based routing on the shared HTTP server

### W2. Verify no `upgrade` event conflict

Both gateways hook the same `server.on('upgrade', ...)`:
- **DuelGateway** (line 42): `if (pathname !== '/duel') return;` — exits for non-duel paths
- **MessagingGateway** (line 48): `if (pathname === '/ws' || pathname === '/ws/chat')` — only handles chat paths

Since both are additive listeners on the `upgrade` event and each checks the path before calling `handleUpgrade`, **they coexist safely**. The Node.js HTTP server fires all `upgrade` listeners; each gateway ignores paths it doesn't own.

> [!IMPORTANT]
> If an upgrade request comes for an unhandled path (e.g., `/foo`), neither gateway handles it and the raw TCP socket remains open. This is acceptable for now — a future hardening task could add a catch-all that destroys unhandled upgrade sockets.

### W3. Write a smoke test for WebSocket connectivity

**New file:** `backend/src/messaging/messaging.gateway.spec.ts`

Test that:
1. The gateway boots and registers on the HTTP server
2. A WebSocket connection to `/ws?token=<valid>` receives `authenticated` event
3. A connection without a token receives a `401` and socket close
4. `send_message` event persists and broadcasts to participants
5. `typing` event is forwarded to the partner only

### W4. Verify REST endpoints respond

Once `MessagingModule` is imported, these endpoints become live:
- `GET /conversations` — list user's conversations
- `GET /conversations/:id/messages` — get messages
- `POST /invitations` — send invitation
- `PATCH /invitations/:id` — accept/decline
- `GET /recruiter/invitations` — list recruiter's invitations

No code changes needed — they're already implemented in the controllers.

## Testing Strategy

- **Unit/Integration tests:**
  - `messaging.gateway.spec.ts` — new: WebSocket connection, auth, message flow
  - `messaging.service.spec.ts` — existing or new: save/retrieve messages, participant validation
- **Manual verification:** Open two browser tabs (recruiter + developer), send messages, verify real-time delivery
- **Build verification:** `npm --prefix backend run build` must pass with the new import
- **No frontend changes needed** — the client code already targets `ws://localhost:3000/ws`

## Boundaries

- **Always:**
  - WebSocket auth requires a valid Supabase JWT (via `?token=` or `Authorization` header)
  - Messages are persisted to the `messages` table (not just in-memory)
  - The `DuelGateway` on `/duel` remains unaffected
- **Ask first:**
  - Removing the in-memory fallback (it exists for offline/dev resilience)
  - Adding WebSocket rate limiting (currently absent on the chat gateway, but the duel gateway has it)
  - Adding read receipts or online presence
- **Never:**
  - Allow unauthenticated WebSocket connections
  - Store message content in audit logs (privacy)
  - Modify the `DuelGateway` code

## Success Criteria

| # | Criterion | Verification |
|---|---|---|
| WC-1 | `MessagingModule` is listed in `AppModule.imports` | Code inspection |
| WC-2 | Backend boots without errors with the new import | `npm --prefix backend run build` + startup |
| WC-3 | `GET /conversations` returns 401 without auth, 200 with auth | curl or test |
| WC-4 | WebSocket to `/ws?token=<valid>` receives `{"event":"authenticated"}` | Integration test |
| WC-5 | WebSocket to `/ws` without token → socket closed with 401 | Integration test |
| WC-6 | `send_message` via WS → message persisted in DB + broadcast to partner | Integration test |
| WC-7 | `DuelGateway` on `/duel` continues to function | Existing duel tests still pass |
| WC-8 | Frontend `ChatWorkspace` connects and shows messages | Manual browser test |

## Open Questions

None — the fix is straightforward (one import line). The entire module is already implemented and tested in isolation; it just wasn't wired into the application.
