# Marketplace integration

## Source and direction

The complete local DevArena application is the host. Work is isolated on `integration/marketplace-complete`; nothing was pushed or applied to Supabase.

Source: `https://github.com/azizwhibi/DEVARENA`, branch `marketplace-complete`, commit `21d851e835243b86c784b507892218ed65d8b170`. Common ancestor with the host: `ba75f365b4b232fd2ae040463b724cf4951f4bea`. The 32 Marketplace/schema files supplied in `FatmaGestion/` were compared against fetched Git blob hashes after newline normalization: all match. After integration and verification, the redundant `FatmaGestion/` source checkout was removed at the user's request. Runtime code uses the host `backend/`, `nextjs/`, and `db/` files below; it has no dependency on that folder.

## Features and mapping

| Source | Host integration |
| --- | --- |
| `backend/src/marketplace/` | Same module/controllers/DTOs/services and tests; registered in the host AppModule |
| Source standalone `/marketplace` | Existing workspace `/marketplace`, inventory through `?view=inventory` |
| Source `/admin/marketplace` | Workspace administration route and sidebar entry |
| Marketplace components | `nextjs/src/components/marketplace/`; uses the existing account context |
| HTTP API | Existing host session API wrapper, bearer authentication, private fetch and problem errors |
| Separate mock/feature flags | Removed from integration; real backend only, no fabricated balances or local purchases |
| `EquippedBadge` | Existing profile header; account-keyed state, optional replay, reduced-motion support |
| Two source Marketplace migrations | One additive, replayable `db/marketplace-integration.sql` |
| Purchase/admin SQL and HTTP tests | Imported tests plus isolated replay/preservation/rollback and frontend transport checks |

Integrated: published catalogue, kind filters, item details/previews, credit balance, explicit purchase confirmation, permanent ownership, paid-price inventory, equipped icon/animation slots, protected challenge-specific hint text, product create/edit/archive and audited administrator credit grants. Source previews use lightweight CSS animations/text, so no additional 3D dependencies or assets are needed.

The source has no full transaction-history screen, external payments, recurring purchases or consumable hint counters. The database ledger is retained. Hints are permanently owned learning aids, accessed through Marketplace details; this does not alter challenge scoring or automatically reveal a challenge hint. No features or products were fabricated to fill these gaps.

## Conflict and security decisions

Shared auth, profile, layout, proxy, PWA and service-worker files were not replaced with older source versions. The existing `profiles.id` UUID and `challenges.id` are reused. `UserGuard`/`AdminGuard`, suspended-account handling, the existing server-side Supabase service, and existing RFC7807 errors remain authoritative.

Purchases derive the buyer from the verified request and price from the locked database item. A wallet row lock serializes spending. One purchase per buyer/item makes duplicate submissions safe: retries return ownership without charging twice. Wallet debit, ledger and ownership are one SQL transaction; missing hints or later write errors roll everything back. Only eligible owned icon/animation items can be equipped. Secret hints are excluded from catalogue queries and require ownership or active-admin access.

The six Marketplace tables are backend-only under RLS; function execution is revoked from public/anon/authenticated and granted only to service_role. Missing wallets represent zero credits; this integration never gifts balances to existing accounts. Existing source wallets, purchases, items and equipped slots are reused. Migration preflight refuses incompatible table shapes or another detected balance store rather than silently resetting/replacing it. Such a database needs an explicit reconciliation before applying SQL.

Styling uses component-local Tailwind utilities and uniquely named cosmetic keyframes. Native Marketplace dialogs retain their purchase and equip controls.

Offline mutations are disabled at purchase confirmation and rejected before fetch by the shared Marketplace transport. Reconnection does not queue or retry purchases. Existing PWA cache exclusions and service-worker code are unchanged. No wallet, inventory, ledger or secret is persisted offline.

## SQL order and startup

1. Review the migration against the shared schema. Existing host identity/admin and skills schemas, `profiles` with role/status, `challenges`, and `audit_log` must already exist. Do not rerun old identity migrations or import source accounts.
2. Apply **`db/marketplace-integration.sql`** in Supabase SQL Editor after review. It is transactional and replayable for the matching source schema. It preserves existing Marketplace records and balances.
3. Optionally apply **`db/marketplace-seed.sql`**. It creates two stable, idempotent **draft** examples only, without users, credits or activity. Existing rows are not overwritten. Publish reviewed products through the admin UI.
4. Restart the existing backend/frontend. Administrators can create/publish products and explicitly grant credits with a reason. No seed grants credits automatically.

No new environment variables are required. Reuse backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and existing host configuration; frontend `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Service-role credentials must never be exposed in frontend configuration. Neither source `.env` nor source accounts are imported.

CMD terminal 1:
```cmd
cd /d D:\devarena\DEVARENA\backend
npm run start:dev
```

CMD terminal 2:
```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run dev
```

Visit `http://localhost:3001/marketplace`; administration is at `/admin/marketplace`. If the SQL is not applied, the UI shows an API failure and explicit retry, rather than fake inventory. Dependencies were compared; all imports are already satisfied by the host versions. There are no dependency changes requiring lockfile replacement.

## Checks and remaining verification

- Backend build and **193 tests in 12 suites passed**, including 47 imported Marketplace service/HTTP tests for request-derived identity, authentication/admin authorization, purchases, errors, inventory and hints. Marketplace/AppModule ESLint passed.
- Frontend TypeScript, full ESLint, production build, skills, Knowledge, and Marketplace transport tests passed. The build initially stopped on an existing Next.js 16.4.0 security-version advisory; the permitted retry succeeded with the advisory still present. Upgrade Next.js separately; its version was preserved during integration.
- Existing safe-next, API, registration and OAuth tests passed. The combined auth script stops at the already-deleted `supabase/templates/recovery.html`. Profile, admin, role-login, recruiter-candidate and PWA tests passed separately. Existing unrelated deletions were preserved.
- `node db/tests/marketplace-integration.cjs` passed using isolated PGlite PostgreSQL, with no live database connection. It executes the source SQL assertions (purchase, duplicate requests, insufficient balance, suspended users, ownership/equip, protected hints, admin restrictions, grants, cascades and privileges), then tests replay, existing wallet/ownership/Knowledge/skill preservation, seed idempotence and injected mid-purchase rollback. Its local test dependency is `.local/verification/node_modules/@electric-sql/pglite`; on another checkout install PGlite in an isolated verification folder first.
- True multi-session lock contention is **not claimed** from embedded PostgreSQL. `db/tests/marketplace-concurrent.mjs` is supplied unchanged, restricted to loopback and disposable `devarena_identity_test*` databases. After provisioning the normal source test identity baseline and applying the integration migration, set local `PGHOST`, `PGDATABASE`, `PGUSER`, optional `PGPORT`/`PG_BIN`/`PG_DOCKER_CONTAINER`, then run `node db/tests/marketplace-concurrent.mjs`. No local psql/Docker server was available to run it here.
- Browser tooling was unavailable during this integration, so visual desktop/mobile, actual purchase dialogs and profile animation playback were not verified interactively at that stage. Supabase schema deployment and live end-to-end use were deliberately not performed. No push, deploy or shared-branch merge was made.
