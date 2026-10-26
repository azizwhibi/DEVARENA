# Automatic developer skills

Developer skills are derived automatically from trusted validated problem results. Administrators still manage the skill catalogue, technologies and weighted problem-to-skill links. Manual developer assignments remain optional training targets and never determine the demonstrated skill profile.

The general sidebar no longer includes Skills. The profile still links to `/my-skills`, and `/skills/[id]` still provides proficiency, history and related problems. Administrative skill management remains in the sidebar.

## Setup

Run `db/automatic-skills.sql` in the existing Supabase project's SQL editor **after** `db/skills-integration.sql`. The new view is additive and replay-safe. It neither changes identities nor modifies attempts, scores, history, existing assignments, topics or skill IDs.

The script has been applied and tested in isolated PostgreSQL/PGlite only. It has **not** been applied to the shared Supabase project.

Restart the backend and frontend after updating the code. The backend needs its existing service-role Supabase access; no new environment variables or dependencies are required.

## Behavior

- `GET /me/skills/demonstrated` uses the authenticated identity. An administrator can read a selected developer through `GET /admin/developers/:userId/demonstrated-skills`.
- The database view joins validated attempts to existing `challenge_skills`. Every linked skill appears automatically, including skills backed by older results. No manually assigned skill record is required.
- Multiple accepted submissions of the same problem contribute one distinct problem to each linked skill. Solving another problem increments the relevant skill counts. Related technologies/categories use existing IDs.
- Removing a training target does not hide demonstrated skills. Archived skills with evidence remain visible as archived. Classification follows current problem-skill links; catalogue edits do not rewrite historical score snapshots.
- Proficiency reuses the existing weighted best-validated-result-per-problem scoring rules. The legacy 75-point starting score and per-submit +/-6 updates are removed from the trusted assessment path. Successful trusted assessments recalculate all linked skills, and failed results add no verified proficiency.
- A demonstrated skill without a score snapshot remains unassessed while its verified problem count is shown. Discovery never invents a score or writes an assessment.
- Database reads through the view are granted only to the service role. Existing guards isolate developers and protect administrator routes. Client-controlled IDs, scores or success flags cannot award demonstrated skills.

There is **no code-execution judge implemented in this application**. Existing admin-only assessment endpoints provide the current trusted validation path. A future judge must persist its server-accepted result in `attempts` and emit the existing `attempt.validated` event (or call the existing recalculation service). Merely viewing a solution, completing a browser quiz or reading a lesson does not create validated evidence. Marketplace purchases and learning progress remain independent.

## Verification

From the repository root:

```bat
node db/tests/automatic-skills.cjs
node db/tests/skills-management.cjs
```

These use the existing optional PGlite installation under `.local/verification/` and never connect to Supabase. They cover multiple linked skills, distinct counts, failed/practice exclusion, replay, historical evidence, user isolation, privileges, manual-target independence and unchanged history/scores. The existing management test also verifies real Knowledge completion and Marketplace transactions do not alter proficiency.

From `backend/`: `npm test -- --runInBand` and `npm run build`.

From `nextjs/`: `npm run test:skills`, `npm run lint`, `npx tsc --noEmit` and `npm run build`.

Manual check after applying SQL:

1. As an admin, link two skills to a problem under Associations or problem administration.
2. As a developer with no validated results, verify the profile shows no demonstrated skills. A training target alone must not change this.
3. Record a trusted validated assessment using the existing admin-only workflow. Both skills should appear in that developer's profile with their technology and one validated problem each.
4. Validate the same problem again: counts and proficiency should not receive a repeat-submit bonus. Validate a different linked problem: the distinct count should increase.
5. Complete browser practice, a Knowledge resource or a Marketplace purchase: verified skill evidence and scores must stay unchanged.
6. Verify a developer cannot access another developer's administrative skill endpoint or submit a success flag to award skills.
