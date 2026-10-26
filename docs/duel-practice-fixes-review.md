# Review receipt: duel profile scores and practice loading (T58–T59)

Implemented 2026-10-26. No phase advancement, commit, push, or database migration performed.

## Result

- Profiles expose and display the existing SQL competitive points, competitive tier, and duel rating alongside skill proficiency. An accepted matching server rating update refreshes account data and the route cache. Background failures preserve the current account; stale requests cannot replace newer data.
- Published challenges with generic titles and no recognized linked skills use their stored category to select and grade questions. Practice request failures and a 10-second timeout offer an in-modal retry instead of indefinite loading. Unknown banks fail closed.

## Graphify nodes and relationships consulted

`DuelRoomService` → stored duel results → `apply_competitive_duel` → competitive leaderboard; `UsersService.getProfile` → `SupabaseService` → profile header; `DuelArena` → accepted rating state → `AccountProvider`. `MeSkillsController` → published challenge metadata → `getChallengeBankName` / `gradeChallengeAnswer`; practice modal → authenticated API helper → question-bank endpoint. SQL sources and seeded generic SQL challenges were verified directly.

`graphify update .` completed with ignored secret/dependency/build paths. Graph integrity checked for missing edge endpoints and excluded source paths. The installed extractor lacks `tree_sitter_sql`, so SQL relationships were checked against source; graph semantic labels may need a later refresh.

## Files changed

- `backend/src/users/users.service.ts`
- `backend/src/users/users.service.spec.ts`
- `backend/src/supabase/database.types.ts`
- `backend/src/skills/me-skills.controller.ts`
- `backend/src/skills/competitive-attempts.spec.ts`
- `backend/src/skills/scoring/challenge-grading.ts`
- `backend/src/skills/scoring/challenge-grading.spec.ts`
- `nextjs/src/components/AccountProvider.tsx`
- `nextjs/src/components/duel/DuelArena.tsx`
- `nextjs/src/components/profile/ProfileForm.tsx`
- `nextjs/src/components/profile/ProfileHeader.tsx`
- `nextjs/src/components/skills/arena/ChallengeModal.tsx`
- `nextjs/scripts/check-competitive-results.mjs`
- `nextjs/scripts/check-practice-loading.mjs`
- `nextjs/package.json`
- `SPEC-competitive-rankings.md`
- `todo.md`
- This receipt and generated Graphify graph/report/manifest/label artifacts.

## Commands and results

Regression tests first failed for missing competitive profile fields/display, indefinite practice loading after failure, and ignored stored challenge category; they passed after implementation.

| Command | Result |
| --- | --- |
| `npm --prefix backend test` | PASS: 29 suites, 315 tests |
| `npm --prefix backend run build` | PASS |
| `npm --prefix nextjs run test:auth` | PASS, includes new practice runtime scenarios |
| `npm --prefix nextjs run test:duel` | PASS |
| `npm --prefix nextjs run test:skills` | PASS: 17 scenarios |
| `node --experimental-strip-types nextjs/scripts/check-competitive-results.mjs` | PASS after final edits |
| `node --experimental-strip-types nextjs/scripts/check-practice-loading.mjs` | PASS after final edits |
| `./backend/node_modules/.bin/tsc.cmd -p backend --noEmit` | PASS |
| `./nextjs/node_modules/.bin/tsc.cmd -p nextjs --noEmit` | PASS |
| `npm --prefix nextjs run build` | PASS; initial run caught an in-progress JSX edit, corrected before successful build |
| Local HTTP GET `/docs`, `/me`, `/login` | 200, 401 application/problem+json, 200 respectively |
| `graphify update .` | PASS |
| `git diff --check` | PASS after normalizing generated report whitespace |

Independent reviewer executed four focused backend suites (49 tests) and both frontend regression scripts. Review covered correctness, simplicity, architecture, security, and performance. Findings resolved: stored category fallback, deterministic random test input, stale profile response protection, and unrelated formatter churn removal.

## Ponytail check and open risks

No new packages, speculative abstractions, scoring formula, or out-of-scope application changes. Existing guards, suspension checks, RFC-7807 responses, server grading, and solo reward restrictions are preserved. The standalone Ponytail skill file was unavailable in the installed skill locations; the explicit AGENTS.md Rule 3 discipline was followed.

Signed-in browser behavior and hosted database availability were not verified; Chrome DevTools tools were unavailable. Existing competitive migration must be installed for competitive profile fields to be available. No SQL mutations were made, so database assertion suites were not rerun. Next's build emitted an existing installed-version security advisory; dependency upgrades were outside this bug-fix scope.
