# DevArena identity checks: T3a–T11 (Phase 4 Cutover)

Scope covers Phase 0 through Phase 4 (T0–T11, Checkpoints A–D). `DEV_BYPASS_AUTH=false` is enforced. Temporary `GET /admin/ping` endpoint is active for `AdminGuard` verification (to be retired in T18). Only use dedicated DEV `qorlygdcfwnrrzvzulcz`. No shared-project changes are authorized without explicit team approval.

## Automated evidence (2026-10-19)

- [x] T3a: DEV SQL suite passed before/after migration replay; fingerprint unchanged at `0e30f77d06165aa5580d1883919cfc7c`.
- [x] T4: backend lint/build/typecheck; 31 tests at this step. Production bypass and invalid bypass UUID exit before Nest starts. Real unauthenticated `/me` returns 401 problem+json and `WWW-Authenticate: Bearer`.
- [x] T5: backend lint/build/typecheck; 40 tests total, including 9 account-deletion tests (ordering, aborts, pagination, folders and idempotency).
- [x] T6: frontend lint/build/typecheck; 11 safe-next assertions and 19 local HTTP assertions, including login input labels, protected redirects, callback failure and static icon access.
- [x] T7: frontend lint/build/typecheck; 13 API scenarios exercise browser/server wrappers with fake SDK/network responses. They do not claim live Auth success.
- [x] T8: frontend lint/build/typecheck; 22 registration scenarios with the Auth SDK mocked and 23 registration HTTP/template assertions.
- [x] T9: frontend lint/build/typecheck; 11 OAuth scenarios test provider definitions, `safeNext` URL generation/sanitization, provider error handling, and connection failures. `OAuthButtons` integrated in `/login` and `/register`.
- [x] T10: frontend lint/build/typecheck; 18 recovery scenarios test enumeration suppression, password validation (min length 8, confirmation match), error differentiation (weak password, 429), non-fatal `signOut` error handling, and `recovery.html` template integrity.
- [x] T11: `DEV_BYPASS_AUTH=false` set in backend config; `GET /admin/ping` guarded by `AdminGuard` implemented and verified (44 backend tests total, testing unauthenticated 401, developer 403, admin 200 `{ message: 'pong' }`, and suspended admin 403). Backend and frontend builds/lints/typechecks pass with 0 errors.

### Spec Success Criteria Status (SPEC-identity.md)
1. **Bypass OFF /me**: [x] Verified via `auth.service.spec.ts` (401 without Bearer token, returns profile with token). Live check documented below.
2. **Signup triggers**: [x] Verified via `supabase/tests/identity.sql` and `migrations/20261018000001_identity_profiles.sql` (role='developer', status='active', unique suffixed username). Client forms verified via `check-register.mjs` and `check-oauth.mjs`.
3. **RLS & PostgREST**: [x] Verified via `supabase/tests/identity.sql` (anon cannot select email/status or private profiles; authenticated UPDATE denied).
4. **Suspended user blocked**: [x] Verified via `auth.service.spec.ts` (throws 403 `account_suspended` on both UserGuard and AdminGuard).
5. **Account deletion & attempt scrub**: [x] Verified via `account.service.spec.ts` (Storage cleanup -> audit log -> Auth deletion) and `supabase/tests/identity.sql` (anonymizes attempt payload, keeps score/challenge).
6. **Production bypass prevented**: [x] Verified via `auth.service.spec.ts` and `auth-config.ts` (throws before Nest boot).
7. **Frontend auth routes & no token in localStorage**: [x] Verified via SSR cookie storage, `proxy.ts` redirects, `check-safe-next.mjs`, `check-api.mjs`. Live browser check documented below.
8. **Tests & builds green**: [x] All 44 backend tests pass, frontend test:auth passes, `npm run build` succeeds in both `backend` and `nextjs`.

- [ ] T8/T9/T10 hosted email settings, OAuth providers, and confirmation-template installation: see `DEVARENA/docs/supabase-auth-setup.md`. Verify real signup, OAuth, and reset flows with accessible inboxes.

Repeat automated checks in PowerShell (Node 22.17 or newer is required for the dependency-free frontend module-hook tests):

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\backend
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build
npx.cmd tsc --noEmit
Set-Location ..\nextjs
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit
```

To repeat the local HTTP assertions, start a built frontend in one terminal, then run the checker in another:

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\nextjs
node node_modules/next/dist/bin/next start -p 3101
```

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\nextjs
node scripts/check-login-http.mjs
```

## Live checks for the human (pending)

The sandbox cannot reach Supabase Auth/Storage HTTP. Keep these unchecked until run from a network-enabled terminal/browser.

- [ ] Dashboard → [DEV JWT signing keys](https://supabase.com/dashboard/project/qorlygdcfwnrrzvzulcz/settings/jwt): confirm asymmetric signing keys are active. Confirm the earlier exposed credentials were revoked by their owner; do not paste them into this file.
- [ ] Run the real Auth/PostgREST/Storage smoke suite. It creates temporary users/files, rejects 3 MiB images, GIFs and cross-folder writes, then cleans up:

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA
node supabase/tests/storage-smoke.mjs
```

- [ ] Start backend and frontend in separate terminals using the ignored `.env` files, with backend `DEV_BYPASS_AUTH=false`. If port 3000 is occupied, identify the existing process before deciding which backend to use; do not terminate unrelated processes.

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\backend
npm.cmd run start:dev
```

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\nextjs
npm.cmd run dev
```

- [ ] DEV dashboard → Authentication → Users → Add user: create an email/password user with email confirmed. Sign in at `http://localhost:3001/login`. Check `sb-*` cookies and header `username · developer`; the username must match `public.profiles`. Copy the access token locally from the sign-in response for this command:

```powershell
$accessToken = Read-Host 'Dev access token (keep local)'
curl.exe -i -H "Authorization: Bearer $accessToken" http://localhost:3000/me
```

Expect 200 and exactly `{id,email,role,status}` matching that user. A request without Authorization must return 401 problem+json with `WWW-Authenticate: Bearer`:

```powershell
curl.exe -i http://localhost:3000/me
```

- [ ] In the DEV SQL editor, replace the UUID below with this user's actual ID and suspend the user. Repeat the same authenticated curl: expect 403 and `code: account_suspended`. Restore active status afterward:

```sql
update public.profiles set status = 'suspended' where id = 'REPLACE_WITH_DEV_USER_UUID'::uuid;
-- Repeat curl before restoring the account:
update public.profiles set status = 'active' where id = 'REPLACE_WITH_DEV_USER_UUID'::uuid;
```

- [ ] AdminGuard verification (`GET /admin/ping`):
  1. As a `developer` user, repeat the authenticated curl to `/admin/ping`:
  ```powershell
  curl.exe -i -H "Authorization: Bearer $accessToken" http://localhost:3000/admin/ping
  ```
  Expect 403 Forbidden (`application/problem+json`).
  2. In the DEV SQL editor, promote the user to admin:
  ```sql
  update public.profiles set role = 'admin' where id = 'REPLACE_WITH_DEV_USER_UUID'::uuid;
  ```
  3. Repeat the authenticated curl to `/admin/ping`: expect 200 OK and `{"message":"pong"}`.
  4. Demote back to developer when done:
  ```sql
  update public.profiles set role = 'developer' where id = 'REPLACE_WITH_DEV_USER_UUID'::uuid;
  ```

- [ ] With the user active, stop your backend and verify local bypass against this UUID, then restore bypass OFF. Do not set production mode:

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\backend
$env:NODE_ENV = 'development'
$env:DEV_BYPASS_AUTH = 'true'
$env:DEV_USER_ID = Read-Host 'Existing DEV profile UUID'
npm.cmd run start:dev
```

Run unauthenticated curl in another terminal: expect that profile's 200 response. After stopping this backend, clear the overrides before restarting:

```powershell
Remove-Item -LiteralPath Env:DEV_BYPASS_AUTH, Env:DEV_USER_ID, Env:NODE_ENV
```

- [ ] Browser: sign out; visit `/profile?x=1` → `/login?next=%2Fprofile%3Fx%3D1`; sign in → `/profile?x=1`. The destination page itself can remain 404 until the later profile track. Visiting `/admin` without a session also redirects. Signed-in visits to `/login` or `/register` redirect home.
- [ ] Try `/login?next=https://evil.com`, `//evil.com` and `/\evil.com` as next values: successful sign-in stays on this origin and falls back to `/`.
- [ ] Test a real `code` callback and a real `token_hash`/`type` email callback; expect cookies and a safe destination. Invalid/expired callbacks return `/login?error=callback_failed`. Email templates/provider setup belongs to T8–T10.
- [ ] DevTools → Application: session is in cookies; no Supabase token appears in localStorage. Network: API calls send Bearer; on 401 exactly one refresh and one retry occur when refresh succeeds. A second 401 redirects to login. 403 suspension must not refresh or redirect in a loop.
- [ ] Sign out: cookies clear, header becomes anonymous, private navigation redirects to login. With no session, an API request returns 401 and the wrapper attempts one refresh before redirecting. Verify keyboard order, visible focus, announced errors and the pending sign-in/sign-out buttons on mobile and desktop.

## Project graph

`DEVARENA/graphify-out/graph.html` is the interactive map, `graph.json` supports queries, and `GRAPH_REPORT.md` records coverage and integrity limitations. Query this graph before further operations, then inspect cited source. SQL is covered by manual semantic extraction because the optional SQL parser is unavailable; it is not a complete SQL dependency analyzer.
