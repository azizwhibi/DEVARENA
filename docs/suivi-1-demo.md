# First review demonstration

Use a dedicated development project or already authorized demo accounts. Keep the existing user IDs. Never reset the shared database to prepare the presentation.

## Preparation (CMD)

Install Node 22.18+ and dependencies with `npm ci` in `backend` and `nextjs`. Configure the same Supabase project using their `.env.example` files; no `.env.local` is needed. Follow `supabase/README.md` for foundations and module migration order. Apply `db/problem-administration.sql` after the existing Skills and Topics scripts before demonstrating the new problem mutations. Templates must also be configured in the Supabase dashboard.

Build and run two terminals:

```cmd
cd /d D:\devarena\DEVARENA\backend
npm run build
set NODE_ENV=production
npm run start:prod
```

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run build
npm start
```

Use `http://localhost:3001`. Service-worker registration is production-only. Phones cannot use the development computer's `localhost`; an ordinary HTTP LAN address is generally not a secure context, so service workers and native installation may be unavailable. Use a trusted HTTPS deployment/tunnel for phone testing. Do not promise offline use before one successful online visit and download.

## Presentation sequence (about 8 minutes)

1. Explain the roles: developers practice and learn; administrators manage catalogues; recruiters use the existing candidate workflow. Learning completion and purchases never manufacture verified proficiency.
2. At 390px, show the mobile navigation, Knowledge catalogue and a resource. Open/close the drawer with keyboard and verify scrolling returns. On desktop, show the same routes without changing themes.
3. In DevTools Application, inspect `/manifest.webmanifest`: identity `/`, scope `/`, standalone display, violet/near-black app branding, 192/512 icons and maskable icon. Inspect the active `/sw.js` worker and its `devarena-offline-v4` cache. The public offline shell is cached; authenticated responses are not.
4. Install using the browser's offered native action. Reopen the installed app. On iOS use Share → Add to Home Screen. Native installation on a physical device remains a manual check; browser response tests do not prove it.
5. As administrator, create **Review disposable draft** in Problems and topics. Enter a statement, choose difficulty and real topic/skill IDs, save, refresh and reopen it. Change the statement, refresh, then delete this never-published, unreferenced draft with confirmation. This demonstrates actual supported deletion without destroying history.
6. Create a second draft and attempt to publish without a statement: show the validation failure. Add a valid statement, publish it, then archive it. Previously published/referenced problems cannot be physically deleted. Show a skill assignment without inventing a score. Existing Marketplace fixtures can demonstrate insufficient-balance and ownership checks; do not grant a fake balance for a screenshot.
7. As developer, open a published Knowledge resource with written content. Choose **Download for offline reading** and wait for success. Open **Offline library**, disable networking, reload, then reopen the app in a fresh tab. Read the downloaded copy and delete it. An external-only course cannot be downloaded as written content; websites and videos still require a connection. No admin, account, purchase, grading, battle or AI operation is queued.
8. Reconnect. Return online; version/availability revalidation runs for the current account. A changed copy is marked stale; download it again explicitly. An unavailable resource loses its stored body. Sign out and confirm the local library is empty. An offline copy is local reading convenience, not permission to call online APIs.
9. Optional: open a published written resource and choose **Explain this lesson**. Show the distinctly labelled, unreviewed AI response. Disable/configure an invalid provider in a development environment and show retry behavior while the ordinary lesson remains readable. Never expose the server key on screen.

## Repeatable checks

```cmd
cd /d D:\devarena\DEVARENA\backend
npm test -- --runInBand
npm run build
cd ..\nextjs
npm run lint
npm run test:auth
npm run test:skills
npm run test:knowledge
npm run test:marketplace
npm run test:duel
npm run build
```

Optional test tools live outside application dependencies:

```cmd
cd /d D:\devarena\DEVARENA
npm install --prefix .local/verification --no-save --package-lock=false @electric-sql/pglite fake-indexeddb playwright-core
node db/tests/problem-administration.cjs
node db/tests/problem-topics.cjs
node db/tests/skills-management.cjs
node db/tests/knowledge-management.cjs
node db/tests/marketplace-integration.cjs
node db/tests/duel-integration.cjs
cd nextjs
node scripts/check-offline.cjs
node scripts/check-sw-runtime.cjs
node scripts/check-review-browser.cjs
```

The browser script expects an actual production frontend at `http://localhost:3101`, a matching backend/API configuration, installed Edge and existing demo credentials. Set `REVIEW_ORIGIN` and `EDGE_PATH` for alternatives. It stores screenshots/report only under ignored `.local/suivi-1`. A blocked sign-in is recorded, and a clearly labelled isolated fixture is used for shell checks; that fallback never counts as live authorization proof.

For the isolated review ports, set `PORT=3100` and `FRONTEND_ORIGIN=http://localhost:3101` in the backend terminal. Build the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3100` in that terminal's environment, then run `npx next start -p 3101`. These temporary terminal values need not change `.env`. The normal commands above use ports 3000/3001. Set `REVIEW_API_ORIGIN` to the matching backend for the browser CRUD checks. The full browser script creates and deletes one disposable unpublished Knowledge draft; it does not alter existing resources. Set `REVIEW_QUICK=1` to skip that mutation and check changed layouts, loaded tables and the drawer/dialog. Set `REVIEW_AI=1` only when an actual authenticated Gemini generation is intended; the default does not make that paid request.

`node backend/scripts/check-ai-provider.cjs` checks configured model metadata. Adding `--generate` makes one small external generation request containing an original array lesson fixture, with no account data. The configured model is editable through `AI_MODEL`. Do not confuse this provider smoke test with an authenticated end-to-end UI test.
