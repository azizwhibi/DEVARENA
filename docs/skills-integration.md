# Aziz + Syrine integration

Aziz's existing application is the host. Its login, registration, OAuth, account recovery, profile editing, avatar handling, account deletion and user administration implementations are preserved. `DEVARENA Syrine/` is retained as the original reference and has not been edited.

After a successful login, the existing `/` destination redirects to `/dashboard`. The header also links to the dashboard. Explicit login destinations such as `/profile/settings` continue to work.

## Database setup required

The supplied projects use different Supabase databases. The combined application keeps Aziz's existing database and credentials. A read-only check confirmed that this database does not yet have the additional skill columns, `skill_categories` or `challenge_skills`.

In **Aziz's development Supabase project**, open SQL Editor and run these files in order:

1. [`db/skills-integration.sql`](../db/skills-integration.sql): add the skill schema.
2. [`db/syrine-skills-data.sql`](../db/syrine-skills-data.sql): import Syrine's 8 categories, 9 technologies, 19 skills, 4 challenges and 10 skill/challenge links. The schema also provides a General category for existing skills.

The import reuses existing technologies and skills by name, preserving their IDs and profile associations. It imports no accounts, attempts, personal progress, roles or credentials. Neither file changes Aziz's profile schema or account permissions. Both files were tested on temporary PostgreSQL, including replay, preservation of an existing account and technology, and access privileges. They have **not** been applied to the live database.

If an earlier version failed while creating `skills_integration_technology_slug`, reopen the updated schema file and run its entire contents again. Slug generation now uses the full UUID, repairs existing duplicates and blank slugs, and preserves existing unique slugs. Regression verification: `node db/tests/slug-collisions.cjs`.

## Run with CMD

Backend terminal:

```cmd
cd /d D:\devarena\DEVARENA\backend
npm install
npm run start:dev
```

Frontend terminal:

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm install
npm run dev
```

Open http://localhost:3001 and sign in using an existing Aziz account. Frontend configuration remains in `nextjs/.env`; backend configuration remains in `backend/.env`. Do not switch the application to Syrine's Supabase project.

## Routes

| Route | Feature |
| --- | --- |
| `/dashboard` | Signed-in overview and skill navigation |
| `/my-skills` | Syrine's skill cards, radar chart and progress |
| `/skills/[id]` | Skill history and associated challenges |
| `/discover` | Technologies from the actual skill catalog |
| `/coach` | Syrine's AI coach, using the signed-in user's data |
| `/arena` | Syrine's practice questions |
| `/admin/skills` | Administrator skill and technology management |
| `/admin/skill-associations` | Administrator challenge links and progress tools |
| `/profile`, `/profile/settings`, `/admin/users` | Aziz's existing account features |

All skill API requests use Aziz's existing session-token and refresh wrapper. Backend skill controllers use Aziz's existing user/admin guards, including suspended-account checks. The original development bypass guards and fixed test user are not imported. Skill styles are scoped to the skill workspace, preserving the account screens' styles. Aziz's existing service worker remains in use; personal skill data is not stored in a shared offline cache.

Practice questions include answers in the browser, so their results do not modify verified scores. Administrative simulation tools remain admin-only. The coach retains its deterministic fallback if an AI provider is unavailable; optional `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY` settings belong only in `backend/.env`.

## Verification

- Frontend production build, TypeScript and integration-file ESLint checks passed.
- Backend build and 110 tests passed, including full-app guard/controller integration.
- Seven frontend skill API scenarios passed, covering real session-token use, empty progress, HTTP/network failures, association preservation and the signed-in account.
- Existing API, redirect, registration, OAuth, profile, user-admin and service-worker checks passed.
- The full frontend auth script stops in the recovery check because the workspace's previously deleted `supabase/templates/recovery.html` is absent. That deletion is outside this integration and was preserved.
- Hash checks confirmed that 168 protected original files, including Aziz's account implementations and Syrine's supplied source, were unchanged.

Real sign-in and skill CRUD against the merged live database remain to be checked after the SQL setup is applied.
