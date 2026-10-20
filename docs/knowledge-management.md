# Knowledge Management

The Knowledge module adds a French learning library to the existing Next.js workspace and a NestJS module registered in AppModule. It reuses Aziz's session-aware API client, UserGuard/AdminGuard, problem-details responses and server Supabase connection. Syrine's measured skill data is read through SkillProgressService; the existing Coach and scoring implementation are preserved. No package dependencies were added for Knowledge.

## Database and deployment

Deployment order:

1. Keep the existing identity schema, including public.profiles with its UUID primary key id, public.technologies and the existing skill progress/history tables.
2. Apply db/skills-integration.sql if it has not already been applied. It supplies skill_categories and challenge_skills and the challenge is_published flag.
3. Apply or replay db/knowledge-management.sql in the existing Supabase project's SQL Editor. Do not reset or replace the database. The schema migration inserts no learning-resource seed data. The separately requested examples have their own optional script.

The Knowledge migration is additive and replayable. It extends an existing compatible knowledge_resources table with missing columns, retains existing resource content, and adds the remaining module tables, indexes, backend-only grants and two atomic RPCs. Legacy rows are retained by a NOT VALID resource check; new and edited rows must pass the check. It does not create another users table or change profile, authentication or skill permissions. Resource/skill edits are transactional. Bookmark/progress writes lock and recheck the published resource, avoiding archive/write races.

Read-only inspection on 2026-10-20 confirmed the live profiles.id is a UUID primary key. The live schema already exposed all seven Knowledge tables and both RPCs with compatible columns/signatures. Zero-row catalogue, skill-filter, bookmark, progress and related-challenge join queries returned HTTP 200. The initial schema inspection made no remote writes. On 2026-10-20, the four authored starter lessons were subsequently published to resolve the empty developer catalogue; the 1,214 imported Coursera records remain drafts. No remote schema changes were made; the migration file remains the deployment source for checking/replaying grants and constraints. End-to-end authenticated writes have not been performed against live user accounts.

The live project does not expose profile_technologies. Knowledge tolerates only a genuinely missing relation (PGRST205/42P01), using measured skills or neutral discovery instead. If Aziz's existing onboarding preference table is provisioned later, selected technologies are used automatically. Other database failures are reported rather than silently interpreted as empty interests. Knowledge does not provision or modify identity tables.

All seven Knowledge tables enable RLS and revoke access from public, anon and authenticated; only service_role gets database access. RPC execution is restricted to service_role. Every NestJS operation separately enforces roles or signed-in ownership because that server role bypasses RLS. Profile deletion cascades personal Knowledge records; resource creator attribution is set null. Published resources are archived through ordinary application actions; physical deletion is allowed only for drafts. Archived bookmark content is redacted and can be removed. A physically deleted resource cascades its bookmarks and activity records.

## Configuration and startup (CMD)

Continue using backend/.env and nextjs/.env. Do not create .env.local. Existing configuration is sufficient:

Backend placeholders:

    SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
    FRONTEND_ORIGIN=http://localhost:3001
    PORT=3000

Frontend placeholders:

    NEXT_PUBLIC_API_URL=http://localhost:3000
    NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY

Never put the service-role key in a NEXT_PUBLIC variable. Knowledge needs no Kaggle, Gemini or embedding credentials. Existing AI Coach configuration remains independent. JSON requests are bounded at 256 KiB to accommodate resource text and escaped CSV payloads.

Backend terminal:

    cd /d D:\devarena\DEVARENA\backend
    npm run start:dev

Frontend terminal:

    cd /d D:\devarena\DEVARENA\nextjs
    npm run dev

Sign in through the existing login. Open /knowledge. Administrators see Administration → Ressources at /admin/knowledge. Existing roles determine access; the module does not promote accounts.

## Frontend routes

| Route | Purpose |
| --- | --- |
| /knowledge | Debounced search, type/difficulty/technology/skill filters, recommendations and pagination |
| /knowledge/[id] | Plain-text content, safe source link, bookmarks, explicit progress, feedback and genuine related challenges |
| /knowledge/saved | Own bookmarks; unavailable resources can be removed |
| /knowledge/progress | Own started/completed resources, percentages and dates |
| /admin/knowledge | Search, status filters, preview, publish/archive, draft deletion and CSV import |
| /admin/knowledge/new | Create a draft |
| /admin/knowledge/[id]/edit | Edit a resource and its reviewed skill/technology associations |

All routes inherit the existing workspace. /knowledge is added to the existing proxy protection; /admin was already protected. /discover remains the technology page. The separate Marketplace entry remains intact.

Resource descriptions and written content render as escaped text, never stored HTML. External links allow HTTP(S) without embedded credentials, open with noopener/noreferrer, and do not automatically complete a resource. Related challenges are queried through actual resource→skill→challenge_skills associations and require challenges.is_published. Their links open the existing skill screen containing those challenges.

## API

There is no global API prefix in the current backend. All operations require the existing authenticated bearer session. List endpoints accept page (1–10000), pageSize (1–50), q (up to 100 characters), type, difficulty, technology UUID, skill UUID and sort (newest/title/oldest). Admin lists additionally accept status. Unknown query/body properties are rejected by the existing validation pipe where DTOs are used.

| Method | Developer endpoint | Result |
| --- | --- | --- |
| GET | /knowledge/meta | Existing active skills and technologies for selectors |
| GET | /knowledge/resources | Published catalogue and own bookmark flags |
| GET | /knowledge/resources/:id | Published resource, own state and real published challenges |
| GET | /me/knowledge/bookmarks | Own paginated saved records |
| PUT | /me/knowledge/bookmarks/:resourceId | Idempotent bookmark; publication checked under lock |
| DELETE | /me/knowledge/bookmarks/:resourceId | Remove own bookmark, including archived resources |
| GET | /me/knowledge/progress | Own paginated learning states |
| PATCH | /me/knowledge/progress/:resourceId | Explicit percentage from 0 to 100 |
| GET | /me/knowledge/recommendations | Deterministic recommendations and delivery IDs |
| POST | /me/knowledge/feedback | resource_id, optional owning recommendation_id, feedback |
| POST | /me/knowledge/events | resource_id, optional owning recommendation_id, event_type=click |

| Method | Administrator endpoint | Purpose |
| --- | --- | --- |
| GET | /admin/knowledge/resources | All statuses, searchable and paginated |
| GET | /admin/knowledge/resources/:id | Preview drafts, published or archived resources |
| POST | /admin/knowledge/resources | Create a draft |
| PATCH | /admin/knowledge/resources/:id | Atomic resource/skill-association edit |
| POST | /admin/knowledge/resources/:id/publish | Validate usable content or safe external link, then publish |
| POST | /admin/knowledge/resources/:id/archive | Archive while preserving learning records |
| DELETE | /admin/knowledge/resources/:id | Delete only a draft; otherwise 409 |
| POST | /admin/knowledge/import | Import normalized Coursera CSV as drafts |

Resource fields use database-style names: title, description, resource_type, content, external_url, difficulty, technology_id, tags, estimated_minutes, source, external_source_id, attribution, skill_ids. Status, actor and publication timestamps are controlled by the server. Supported types: article/tutorial/video/documentation/course. Difficulty: unknown/beginner/intermediate/advanced. Unknown duration is null. Resource titles are 2–200 characters; descriptions up to 2000, content up to 100000, tags up to 20 of 50 characters each, skill associations up to 30. The editor bounds text at 80000 characters and the request-body bound still applies.

A progress percentage below 100 means started; 100 means self-reported completed. Starting writes 0 without claiming completion. Repeating completion preserves the original completion timestamp. Reopening clears completion while preserving first started_at. No Knowledge service writes attempts, user_skill_progress, user_skill_history, Dev Score or challenge validation.

Feedback is the latest useful/not_relevant/too_easy/too_difficult choice for an owning user/resource pair. A supplied recommendation ID must belong to that user and resource. Clients cannot choose another user for personal operations. Resource availability is rechecked on detail, bookmarking, progress, feedback and clicks.

## Coursera CSV import

No actual dataset CSV or model artifacts were present in the repository. The importer implements the explicitly requested normalized contract; inspect a real export before importing it.

Use Administration → Ressources → Importer un catalogue CSV. Choose a UTF-8 file, supply the dataset/source attribution, then import. Files are limited to 80 KB in the UI, at most 500 data records per batch. Reports contain accepted, rejected and duplicate counts plus logical CSV record numbers and reasons. No third-party course content is downloaded.

Required headers:

    resource_id,title,description,tags,difficulty,external_url

The parser supports UTF-8 BOM, LF/CRLF, quoted commas, multiline cells and escaped double quotes. Tags accept a quoted JSON string array or delimiter-separated text using semicolons, pipes or commas (commas must be CSV-quoted).

Difficulty mapping is explicit: beginner/beginner level/introductory → beginner; intermediate/intermediate level → intermediate; advanced/advanced level/expert → advanced; blank/unknown/not specified/not specified level/mixed/mixed level → unknown. Unsupported labels reject that row for review. No duration is inferred. New imported resources are external courses with empty written content and draft status, and preserve their URL and supplied attribution.

The stable import identity is (source=coursera, external_source_id=resource_id). Duplicate rows and replay are skipped, including concurrent unique-key conflicts. Reimport never overwrites reviewed text, associations, attribution or publication status. The import does not invent technology or skill IDs: review mappings through the existing catalogues in the editor before publishing. Existing imported source identities are not editable in the ordinary form.

## Optional examples requested by the user

Paste db/knowledge-example-resources.sql into Supabase SQL Editor to add four complete, original French learning resources as drafts. Existing PostgreSQL, React and JavaScript technologies are matched by their actual names, with no invented UUIDs. Git remains unassociated if that technology does not exist. The live skills table was empty at read-only inspection, so no resource/skill links are fabricated. The script does not create bookmarks, progress, recommendations, feedback, events or fake accounts. Duplicate source identities are skipped on replay and existing reviewed edits are preserved.

The insertion script was supplied for SQL Editor and those resources now exist in the database. The four authored lessons have subsequently been published following the user’s request to fix their absence in the developer library. The equivalent, replayable publication statement is db/publish-knowledge-examples.sql; it targets only those four source identities and never publishes imported courses. Review/publish other resources through /admin/knowledge when ready. The same authored content is in db/knowledge-example-resources.json. A trusted-operator alternative is backend/scripts/seed-knowledge-examples.cjs, dry-run by default; --apply uses the existing server environment to insert drafts and preserves existing records. It leaves created_by null rather than impersonating an application user.

## Recommendations and Kaggle status

The implemented method is deterministic-v1. It considers the latest 200 published resources with a stable UUID tie-break, explicit resource/skill associations, existing evaluated skill results, existing technology preferences when available, and suitable difficulty. It reuses MIN_ATTEMPTS and THRESHOLDS from the existing scoring configuration; it does not calculate a new technical proficiency score. Unknown/null/invalid/not_evaluated measurements are not zero. Resource completions and not_relevant feedback exclude resources; completion and publication are checked again at delivery. Exclusions are queried within candidate IDs to avoid default database row-limit truncation. Up to six resources are delivered.

Resources linked to measured skills below the existing advanced threshold are prioritized, with reasons referring to an evaluated skill in development. A technology match is explained as a selected profile technology. New users with no measurements receive interest matches, or neutral published-resource discovery if no interests exist. No explanation invents mistakes, outcomes or improvement percentages. Unknown difficulty is neutral. Ranking weights are ordering heuristics and are not exposed as confidence or accuracy.

knowledge_recommendations stores generated deliveries with batch, position, method, target skill and evidence snapshots. It does not record an impression. Only actual resource/source link actions submit click events. Display/impression tracking is not implemented or claimed. Explicit completions remain self-reported. Admin previews do not submit learning click events. Feedback and clicks never change technical scores.

Per the current request, the Kaggle model is not integrated. There is no Python service, model download, embedding call or additional runtime dependency. The deterministic baseline works with no model service at all. A semantic-service outage cannot affect current requests because no semantic endpoint is used. Database or application failures remain errors with retry UI; they are not mislabeled model fallback results.

When artifacts are ready for sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2, the remaining semantic work requires:

1. A pinned model revision, precomputed embedding dimensions/normalization, artifact version and generation timestamp.
2. A stable mapping from imported external_source_id to actual knowledge_resources.id UUIDs. Never use CSV row numbers as application IDs.
3. A catalogue fingerprint over the normalized input fields for each UUID, plus artifact/model versions, so edited, archived, removed or newly added resources can be detected.
4. A separate private Python service loading artifacts once at startup, a health endpoint and bounded request sizes. NestJS should use server-side configuration, a short timeout, validate response IDs/versions and retain deterministic-v1 on unreachable, malformed or stale model results.
5. Publication/completion rechecks in NestJS after semantic ranking. A model response must never bypass these checks. Similarity remains a ranking value, not confidence, learning probability or accuracy.

Do not configure an embedding URL yet: the adapter is intentionally deferred until compatible artifacts exist. Normal library use never calls Kaggle.

## Human-reviewed evaluation

Copy docs/knowledge-evaluation.template.json and fill cases after reviewers evaluate actual resource relevance. Keep this offline file separate from application metrics. Each case has a non-identifying case_id, context/evidence notes, a baseline ordered array of resource UUIDs, an optional semantic ordered array, and judgments mapping every candidate UUID to 0 (irrelevant), 1 (relevant) or 2 (highly relevant). Review the same candidate pool for both systems. Missing judgments fail evaluation rather than being silently treated as irrelevant.

Run from backend:

    node scripts/evaluate-knowledge.cjs path\to\human-review.json

The evaluator reports precision@5 and NDCG@5. A semantic comparison requires artifacts and human labels; no real comparison results are claimed yet. The template contains no fabricated users or resources. Automated checks use an explicitly labeled in-memory evaluation fixture and never write user metrics.

## PWA and verification

The existing manifest, installation UI, service worker and offline page are unchanged. The worker stores only its existing offline/static assets. Knowledge API, personal progress, recommendations and admin responses are not cached by it. Knowledge navigations use the existing network-first offline-page fallback and are not stored. There is no resource download/offline-reading feature.

Checks executed successfully during implementation:

- Backend build and full Jest suite: 134 tests across 9 suites passed.
- Frontend Knowledge lint and TypeScript checks.
- Next.js production build, including all seven Knowledge routes and the existing routes.
- 24 isolated PostgreSQL checks: fresh/additive schema replay, retained legacy text and profiles, grants/RPC restrictions, publication validation, atomic skill-link edits, bookmarks, completion/reopening and archive access.
- Frontend safe-text rendering, unsafe-link rejection, session-authenticated API use, private service-worker routing and offline evaluation checks.
- Read-only live schema and five zero-row relationship queries; no live account data or content was printed.

A browser inventory returned no enabled browsers or applications, so mobile/desktop visual checks were unavailable. Still required in a real authenticated browser: create/review/publish a resource as admin, discover/bookmark/start/complete it as developer, submit feedback, verify archived access, and review mobile/desktop layouts. A real CSV must be reviewed before import. Kaggle artifacts and semantic comparison remain deferred.

Reproduce local checks from the repository root (CMD):

    node db/tests/knowledge-management.cjs
    cd backend
    npm run build
    npm test -- --runInBand
    cd ..\nextjs
    npx tsc --noEmit
    npx eslint src/components/knowledge src/lib/knowledge.ts
    npm run test:knowledge
    npm run test:skills
    node scripts/check-pwa.mjs
    npm run build

The isolated PostgreSQL verifier reuses the existing .local/verification installation of @electric-sql/pglite and adds no project dependency. If absent, its existing setup is documented in db/tests/slug-collisions.cjs. The complete legacy frontend auth script still depends on the workspace's previously deleted supabase/templates/recovery.html; this module does not restore unrelated deleted files.

## Knowledge navigation validation

The four Knowledge pages export instant=false because the shared workspace waits for a browser-loaded account before rendering children. Next.js 16.4 cannot inspect those dropped page segments during instant-navigation validation. This scoped setting follows Next.js’s documented opt-out and preserves the existing account gate, API authorization and Cache Components configuration. No shared cache or draft visibility exception was added.
