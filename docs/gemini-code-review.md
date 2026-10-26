# Automatic code reviews

Developers open **Problems**, select a problem, choose **Code**, and submit a solution. The backend reads the published statement and asks Gemini to review the code. A completed, assessable review with an integer score **at least 90** marks the problem **Solved (AI-reviewed)** automatically. There is no administrator approval step. Below 90 means **Needs changes**; an ambiguous/incomplete problem means **Unable to assess**.

The percentage is an AI estimate of correctness, not measured test accuracy. No submitted code is executed. The profile and dashboard show AI-reviewed skills and distinct solved-problem counts separately from quiz practice and verified proficiency. Existing accepted assessments, scoring rules, history, Knowledge progress, Marketplace credits and Battle Code are unchanged. Repeated submissions cannot inflate solved counts; a later failed review cannot remove an earlier solve.

The profile includes **Languages** and **Skills**. Language counts use the actual language recorded with each successful submission, never the problem title or a skill's primary technology. A problem solved twice in JavaScript counts once under JavaScript. Solving it in Python too counts it once under Python, while the overall solved count and each related skill still count that problem once. Existing saved code reviews are included automatically; no backfill or new database migration is needed. Failed, pending, unassessable and quiz-practice rows do not contribute.

Skills appear as compact tags with distinct solved-problem counts. Advanced, Intermediate and Fundamental describe topic complexity, not the developer's assessed proficiency or Gemini review percentage. The explicit mapping is in `backend/src/skills/code-review/skill-groups.ts`; unknown/custom skills appear under Other skills. Each group initially shows five tags and can be expanded using Show more. The layout stacks on mobile and preserves the existing dark/violet theme. The dashboard retains its review-score cards.

## Setup (CMD)

Use the existing backend-only settings in `backend/.env`:

```dotenv
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_API_KEY=your_existing_gemini_key
```

The key is never included in frontend environment variables, browser requests, persisted results, or error responses. The existing Knowledge configuration is reused.

```cmd
cd /d D:\devarena\DEVARENA\backend
npm run start:dev
```

In a second CMD terminal:

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run dev
```

Open `http://localhost:3001`, sign in as a developer, and use **Problems**. The primary problem title opens the code editor. **Quiz** retains the existing practice flow. Mobile uses Problem / Code / Result tabs. Drafts are scoped to account, problem and language in the current browser tab. Submitted code and reviews persist on the server and can be restored after reload.

No schema migration is required: this feature reuses `attempts` with `metadata.source = 'gemini_code_review'` and `is_validated = false`. It does not require a new table or weaken RLS. The existing attempts table must remain inaccessible for direct browser writes. Do not manually set `is_validated` on an AI review.

Existing problems must reference real skill IDs through Sirine’s `challenge_skills`. For the three original JavaScript, Python and SQL problems, an optional replay-safe setup is available:

```cmd
cd /d D:\devarena\DEVARENA\backend
node scripts/setup-problem-skills.cjs
node scripts/setup-problem-skills.cjs --apply
```

The first command is a dry run. The second reuses or creates four catalogue skills and ensures six links, preserving existing weights. It creates no problems, attempts, proficiency or account records. It refuses missing/ambiguous original problems and conflicting or archived skill entries. The configuration is `db/problem-code-review-skills.json`.

## API and persistence

All routes use the existing authenticated `UserGuard`. Identity comes from the session, never the request body.

- `GET /me/code-reviews/problems/:problemId`: published statement, supported languages, latest own review.
- `POST /me/code-reviews/problems/:problemId`: `{submissionId, language, code}`. Supported languages: JavaScript, TypeScript, Python, Java, C++; problems titled `SQL: …` use SQL separately.
- `GET /me/code-reviews/:submissionId`: own result or pending/failed state.
- `GET /me/code-reviews/summary`: distinct AI-reviewed solves and skill aggregates, scoped to the signed-in account.

Each submission ID is a UUID generated for the code being submitted. The backend saves a pending claim before contacting Gemini. Concurrent retries reuse it; an existing ID cannot be changed to different code or a different problem. Owner checks prevent reading another account’s code. A source-specific state machine distinguishes pending, completed and failed requests. Pending requests older than two minutes are displayed as failed so a crashed process cannot leave the editor permanently blocked.

Review inputs are limited to the public title, statement, selected language and submitted code. No private profiles, reference solutions or hidden tests are sent. Prompts treat code comments and statement text as untrusted input. Structured output is validated at runtime; malformed, blocked, truncated or unavailable responses never award a solve. The problem is rechecked before saving a successful review in case it changed or was archived while Gemini was running. Provider requests time out after 30 seconds.

Controls: maximum 20,000 code characters; three reviews per minute and one in flight per account per backend process; a persisted rolling 24-hour cap of 30 submission claims per account. The per-process controls reset on restart and are not a distributed quota. The global API throttler also remains in effect.

Google documents that structured output does not guarantee semantic correctness: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). A future isolated test runner can supply test-verified results independently of these AI reviews.

## Verification

```cmd
cd /d D:\devarena\DEVARENA\backend
npm test -- --runInBand
npm run build
node scripts/check-code-review.cjs --live
```

The optional live check sends two original fixtures to Gemini (one correct, one incorrect) and writes nothing to the database. It consumes two Gemini calls.

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run lint
npm run build
```

Manual checks:

1. Submit incorrect code; the result stays unsolved below 90 and explains issues.
2. Submit correct code; a score of 90 or more shows **Solved (AI-reviewed)** without an admin.
3. Open Profile and Dashboard; linked skills and the distinct problem count appear. Refresh and confirm persistence.
4. Submit the same problem again; it counts once. A later unsuccessful submission does not undo a previous solve.
5. Use another account; it cannot load the first account’s source or review.
6. Test SQL separately; non-SQL languages are unavailable on an SQL problem.
7. Disconnect or use an invalid server key; no false success appears. Restore connectivity and retry.
8. On a 320–390px viewport, switch tabs, edit code, submit, and verify that the footer is reachable and the page has no horizontal overflow. Keyboard focus stays in the dialog and returns to the catalogue on close.
9. Verify `user_skill_progress`, assessment history, credits and Knowledge completion remain unchanged by AI reviews.
