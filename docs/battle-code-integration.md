# Battle Code integration

Habib's `habibGestion/` supplied the 1v1 quiz module. Only battle types, the ten-question bank, room arbitration, matchmaking, and their tests were brought into the host. The client was adapted to the current account context, shared shell, English copy, lucide icons, and violet design tokens. Source user management, authentication, profile screens, environment files, account seeds, and user migrations were not imported. After integration verification, the source folder was removed at the user's request. The integrated module lives in `backend/`, `nextjs/`, and `db/`.

## Included

- **Battle Code** is the seventh sidebar item, after Marketplace, with a swords icon and the existing violet active state. It opens `/duel`; the source alias `/arena/duel` redirects there.
- Online matchmaking pairs two different authenticated developers. Both confirm within ten seconds before play starts. Declines and confirmation timeouts cancel the proposal; the available participant can be requeued.
- Ten rounds use ten-second question timers and two-second result reveals. Correct answers earn Habib's original `500 + round(remaining / 10000 * 500)` battle points. Incorrect answers and timeouts earn zero.
- Server result messages update both scoreboards, reveal answers after resolution, and determine the winner. Results, per-round points, accuracy, average response time, and another-match actions are available.
- Explicit DevBot practice simulates the opponent locally. It supports the same round format and replay without database activity.
- A leave confirmation explains active-match forfeits.

## Host authentication and data

`DuelGateway` uses the already installed `ws` transport on the existing Nest HTTP server, so **no new dependencies** are required. It reuses the host `AuthService` for token, role, and suspended-account checks, then reads the current profile username. Identity is never accepted from client join fields. JWTs travel in an initial authentication frame, never URL query parameters. Connections have authentication deadlines, frame limits, heartbeat cleanup, and browser-origin checks.

Round timing and points use the server's receipt time. Submissions must match the authenticated identity, connected socket, current round, question, and option range. Repeat answers are ignored. Correct indices are omitted from round-start messages and opponent answers remain hidden until resolution. This is a quiz game using a fixed practice bank; it is **not** a verified proficiency assessment.

Only `duel_matches` receives completed online results. Profile XP, Dev Score, tiers, skill measurements/history, Knowledge progress, Marketplace credits, and ownership are unchanged. The host's existing user-management files were checked against their pre-integration hashes: all 36 remained unchanged.

## Database and startup

Run `db/duel-integration.sql` in the existing project's SQL Editor to enable saved battle results. It reuses `profiles.id`, preserves an existing compatible `duel_matches` table, and is replayable. It does not alter profiles or import users. Table access is restricted to the backend service role; deleting a referenced account preserves historical scores with null identity references.

This migration was tested against isolated PostgreSQL; it was **not applied to shared Supabase**. Live play does not fabricate saved records if persistence is unavailable: the backend logs the failure.

Restart both existing servers in CMD:

```cmd
cd /d D:\devarena\DEVARENA\backend
npm run start:dev
```

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run dev
```

Open `http://localhost:3001/duel`. For online play, use two different existing developer accounts in separate browser profiles/devices. Signing into one account in two tabs does not create a valid two-player match. DevBot needs only one account.

The socket URL is derived from the existing `NEXT_PUBLIC_API_URL`. Optional `NEXT_PUBLIC_DUEL_WS_URL` can specify the socket host behind a deployment proxy; `/duel` must forward WebSocket upgrades. Browser origin must match the backend's existing `FRONTEND_ORIGIN`, default `http://localhost:3001`. HTTPS deployments need WSS.

Matchmaking and live rooms remain in memory, as in Habib's module. Run one backend instance for these battles unless shared room routing/storage is implemented. Server restarts do not resume active games.

## Verification

- Backend compilation and full suite: **206 tests across 15 suites passed**, including 17 battle tests.
- Isolated real WebSocket tests cover rejected authentication, duplicate identities, origin rejection, identity spoof attempts, mutual acceptance, hidden answers, authoritative resolution, repeated answers, and forfeit winners.
- Frontend lint, TypeScript/production build, battle-state checks, skills, Knowledge, Marketplace, and PWA checks passed. Both battle routes appear in the production route table.
- `node db/tests/duel-integration.cjs` passes migration replay, profile/XP/proficiency preservation, private table privileges, and historical-score preservation after account deletion, without shared database connections.
- Browser screenshots under `.local/design/battle-*.png` cover the lobby, practice, and results at 390, 768, and 1440px. A complete ten-round DevBot match, replay reset, leave confirmation, and offline matchmaking rejection were verified. The sidebar has seven items and the active Battle Code link; no page overflow or duplicate main landmark was found.
- No GitHub push or deployment was performed. No real online match against shared accounts was used for transport verification; the socket tests isolate authentication and persistence.
