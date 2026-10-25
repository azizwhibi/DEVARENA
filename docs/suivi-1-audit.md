# First academic review audit

Date: 2026-10-24. Repository implementation is authoritative. The separately named `Texte collé(6).txt` was not present in this request; no missing attachment content was assumed.

## Baseline and scope

Inspected the installed Next.js 16.4 documentation for offline support, PWAs and client components; frontend/backend scripts, authentication and recovery, Knowledge services/types/components, service worker, manifest/icon generation, problem/topic/skill administration, Marketplace, module SQL and existing tests. `nextjs/AGENTS.md` was the applicable source instruction. Existing uncommitted work and unrelated deletions were preserved; no owner-folder reorganization, BYTE restoration, compiler or Learning Hub course schema was introduced.

Baseline: **208 backend tests passed**. `test:auth` failed with `ENOENT` for `supabase/templates/recovery.html`; this was an existing failure. The old service worker cached an informational offline page, activated updates immediately, removed unrelated caches, and swallowed registration failures. Problem administration had topics/associations but no complete problem lifecycle.

## Requirement audit

| Requirement | Existing implementation | Confirmed gap | Fix | Verification evidence | Remaining limitation |
| --- | --- | --- | --- | --- | --- |
| Useful offline mode | Service worker and `/offline` warning | No saved lessons or cold reader independent of account APIs | Authorized snapshot endpoint; explicit download; allowlisted IndexedDB records; standalone `/offline.html`; list/read/delete; version/availability revalidation | Real developer download in production Edge; network disabled; reload and fresh-tab protected navigation fallback; read/delete; reconnect; real IndexedDB isolation and quota/denial/failure tests | Initial online preparation required. Browser storage can be cleared/evicted. Downloads are local convenience, not encryption or server authorization. External videos/websites stay online |
| Safe offline storage | No resource persistence | Account separation, cleanup and incomplete-write handling missing | Owner-keyed rows, account-switch epochs, logout/deletion cleanup, atomic transactions, unavailable-body removal | IndexedDB tests cover account switching, concurrent activation, logout clearing, failed downloads, stale and unavailable copies; browser verifies separate accounts | Suspensions/publication changes cannot be discovered while disconnected; revalidation occurs when returning to the authenticated online app |
| Service worker reliability | Network-first navigation and static cache | Broad cache deletion, immediate update activation, silent registration errors | Public standalone shell precache; fail installation on missing required asset; DevArena-only cleanup; no automatic `skipWaiting`; visible update/reload control; registration failure notice; RSC/auth/API exclusions | Worker event harness tests failed installation, no partial cache, private/RSC exclusions, offline fallback, controlled updates and unrelated-cache preservation; actual production registration/cold reload | Physical install/update during a real purchase or battle remains a manual user journey. First-ever offline access without any installed worker cannot be supplied by a website |
| Installable manifest | Existing generated manifest, 192/512/maskable and Apple icon routes | Missing explicit stable identity/scope; install outcome handling incomplete | `id` and `scope`; accepted/dismissed/failed prompt handling; installed-state event cleanup; session-only dismissal; iOS instructions; notices moved into document flow | Generated manifest link and actual PNG responses/dimensions verified in Edge | Native install acceptance/reopen on physical Android/iOS remains manual. Plain HTTP LAN addresses are not equivalent to HTTPS/localhost |
| Mobile-first interface | Existing dark/violet responsive shell and module styles | Long Knowledge descriptions made catalogue cards excessively tall; mobile drawer could remain modal after desktop resize; notices could overlap controls | Three-line card previews; full detail text retained; 44px Knowledge navigation; drawer resize close; safe-area-aware in-flow PWA controls | 88 initial viewport checks at 360/390/768/1440; real developer/admin sessions; screenshots under `.local/suivi-1`; targeted final run checks changed screens, drawer/dialog and loaded tables | No physical phone/virtual-keyboard or screen-reader certification. Some initial screenshots captured loading states; targeted loaded-state checks provide the stronger evidence |
| Entity CRUD and rules | Working user, Skills/Technologies, Knowledge and Marketplace services/SQL; topics CRUD | Problem lifecycle absent; setup files deleted | Reuse existing modules and guards; add problem administration; restore required setup sources | 222 backend tests, module checks, isolated PostgreSQL transactions and live admin Knowledge CRUD | New problem administration requires its additive SQL to be deployed before live mutations |
| AI bonus | Deterministic recommendations; server-only Gemini config already present | No small complete authenticated learning action | `POST /knowledge/resources/:id/explain`; validated action/UUID; published written context only; bounded request; 15s timeout; safe plain-text rendering; labelled unreviewed output; per-user limits | Unit/HTTP tests cover access, input, omitted secrets/private fields, absent config, timeout, provider failure, blocked responses, limits and publication recheck; real authenticated UI returned a Gemini explanation | Limits are per server process: 5/minute, 30/day and one concurrent request per user. Restart/multi-instance deployments need shared limiting. Output is not reviewed or saved/published |

## CRUD and business-rule trace

| Entity | Frontend → backend → database | Rules and evidence |
| --- | --- | --- |
| Skills | `/admin/skills` → Skills/Assignments services → existing `skills`, `user_skill_assignments`, progress/history | Required fields, normalized duplicate prevention, role guards, archival of referenced records, assignment separate from measurement. Skills management PostgreSQL and HTTP checks pass |
| Technologies | Same administration screen → Technologies service → existing `technologies` | Required names, duplicates, active/archive behavior, retained references; existing integration/management tests pass |
| Topics | `/admin/problems` → Problems controllers/service → existing `topics` / `challenge_topics` | Unique names/slugs, archive/restore, multiple links, real visible counts, transactional replacement, guarded writes. Topic SQL and backend checks pass |
| Problems | Same catalogue/admin screen → new validated CRUD endpoints → existing `challenges`, topic/skill links | Draft creation, editing, publish validation, archive, confirm disposable-draft deletion; actor from session; duplicate title serialization; transaction rollback on bad associations; retained weights/attempts; published/referenced records cannot be deleted. New SQL/HTTP tests pass; shared deployment pending |
| Knowledge | Existing editor/admin/library → existing Knowledge services/RPCs → existing seven Knowledge tables | Draft CRUD, publish validation, archival, ownership, bookmarks, explicit learning progress and feedback preserved. **Live** administrator created/edited/reread/deleted one disposable unpublished resource and received 400 for an invalid title; no fixture left published |
| Marketplace | Existing admin/shop/dialog → existing Marketplace services/RPCs → products, wallets, ledger, purchases/equipment | Atomic purchase; sufficient balance; duplicate purchase does not charge twice; owned-item-only equipment; protected hints; archive products with history. Real PostgreSQL fixture tests and frontend/backend checks pass. No live purchase, credit grant or artificial balance was created |
| Users/profiles | Existing Aziz forms/admin → existing guarded identity/account services → profiles/Auth/Storage | Existing validation, role boundaries, redirect safety, update/delete contract and recovery helpers preserved. Auth checks and live admin/developer sign-in pass. No users created or roles changed |

Practice remains explicitly **quiz practice**, with no compiler or invented judge verdicts. No Knowledge completion, purchase, offline operation or AI response writes verified proficiency. The database tests exercise real Marketplace purchases and resource completion against isolated fixtures and confirm measured scores/history remain unchanged.

## Files and migration deployment

New additive migration: **`db/problem-administration.sql`**, after `db/skills-management.sql` and `db/problem-topics.sql`. Adds lifecycle timestamps and service-only transactional problem mutations; keeps existing problem IDs and associations. No Knowledge schema migration is needed for offline reading or transient explanations. Optional seeds remain separate and were not added for this review.

Restored seven existing foundational SQL files under `supabase/migrations/` (`20261018000000` through `20261019000003`), `supabase/precheck.sql`, optional `supabase/seed/technologies.sql`, and confirmation/recovery templates. Replaced the missing `supabase/README.md` with current setup and ordering instructions. The empty-development baseline must never be applied over the established shared project. These restorations are source files, not evidence of deployment.

**Shared Supabase migrations applied during this review: none. Shared seeds executed: none.** New and existing module migrations were applied/replayed only inside disposable in-memory PGlite test databases. Live tests used already authorized accounts, existing publication state and normal APIs. One live Knowledge draft was created, edited, read and deleted for CRUD proof. Reading the catalogue also invokes the existing recommendation-delivery recording behavior. There were no account creations, role changes, credit grants, purchases, bookmarks, learning-completion or skill-score mutations in the live checks.

## Verification record

- Backend build and **222 tests / 17 suites** passed; baseline was 208 / 15.
- Frontend ESLint, production build and TypeScript compilation passed; 36 routes generated. Auth, Skills, Knowledge, Marketplace and Battle checks passed. Node prints a non-failing module-format warning in some existing verification scripts.
- All selected isolated PostgreSQL suites passed: problem administration, topics, skills management, Knowledge (24 checks), Marketplace, Battle. Migration replay, persistence, uniqueness, roles, references and transactional rollback are verified without a shared-database reset.
- Recovery: restored template passes all **18 recovery checks**; **19 production HTTP checks** verify login markup, protected-route redirects, safe next handling and failed callback behavior. Real email delivery/password reset was not executed.
- Production browser: system Edge driven by Playwright Core, Next on 3101 and Nest on 3100, auth bypass disabled, existing admin/developer demo accounts. Full report: `.local/suivi-1/browser-report.json`; targeted final report: `.local/suivi-1/browser-final.json`; screenshots in the same ignored directory. Initial restricted-network runs were superseded by successful network-enabled runs, not counted as application defects.
- Final targeted run: **28 additional viewport checks**, all without horizontal overflow. It waits for loaded admin tables/forms, verifies drawer Escape/scroll restoration and resize closure, checks actual CacheStorage entries against the public allowlist, and repeats real authorized download/cold offline reading/deletion with the final v4 shell. A preceding targeted pass also opened/closed the Marketplace dialog without purchasing. The resource-card preview fix is included. No additional paid AI call or CRUD mutation was performed in either targeted pass.
- Optional test tools (`@electric-sql/pglite`, `fake-indexeddb`, `playwright-core`) were installed only under ignored `.local/verification`. No new application runtime dependency was added.
- Gemini external calls completed: **one model metadata GET**, **one tiny original-fixture generation POST**, **one authenticated published-resource explanation POST**. Model access and generation returned HTTP 200 for configured `gemini-2.5-flash-lite`. Provider behavior follows the [official generateContent API](https://ai.google.dev/api/generate-content). Failed sandbox transport attempts were not successful model calls. No hidden tests, reference solutions, account details or API keys were sent as prompt content or printed.

## Review checklist

| Requirement | Status |
| --- | --- |
| Useful offline learning, including cold reopen/read/delete | Implemented and browser verified |
| Install manifest, icon responses and worker setup | Implemented and verified; physical native installation manual |
| Responsive dark/violet interface | Verified at four widths; phone keyboard/screen-reader checks manual |
| Existing entity CRUD and business rules | Preserved; automated/SQL evidence plus live Knowledge CRUD |
| Full problem administration | Implemented and isolated-test verified; **shared SQL deployment pending** |
| Recovery/setup repair | Source and automated checks verified; hosted SMTP/template configuration manual |
| Small Gemini learning feature | Implemented; authenticated UI and actual provider response verified |
| Kaggle/embeddings, compiler and larger Learning Hub | Deferred, outside this first-review scope |

Use `docs/suivi-1-demo.md` for the presentation and exact CMD commands. No commit or GitHub push was performed.
