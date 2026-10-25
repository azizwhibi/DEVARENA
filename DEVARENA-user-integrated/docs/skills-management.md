# Skills and Technology Management

This completes the existing Sirine/Syrine module inside the current DevArena host. Authentication, profile IDs, Knowledge skill IDs, Marketplace data and BYTE remain shared. Coach IA remains removed, following the earlier explicit removal request; no replacement AI service is introduced.

## Required SQL

1. Existing `db/skills-integration.sql` must already be installed.
2. Review and apply **`db/skills-management.sql`** before starting this updated version. The SQL was verified in isolated PostgreSQL, not applied to the shared Supabase project.
3. If the catalogue is empty, the existing **`db/syrine-skills-data.sql`** is the optional original catalogue import. It contains no user accounts or user assessments. No placeholder scores or automatic balances are seeded.

The management migration adds normalized unique-name indexes and a backend-only `user_skill_assignments` table keyed by the existing `profiles.id` and `skills.id`. Existing developer progress rows are backfilled into assignments without altering scores. Existing explicit inactive assignments survive migration replay. The first new measured progress row also creates an assignment if none existed; it does not reactivate an explicitly removed assignment.

If pre-existing names collide after trimming/case normalization, unique-index creation fails transactionally. Review and rename the duplicates explicitly rather than deleting referenced records. Archived names stay reserved; restore an archived item instead of creating a replacement identity.

## Administrator flows

- `/admin/skills`: add, list, search, edit and remove skills or technologies. The existing skill form and statistics modal are reused. A skill keeps its category and optional technology association. Names are trimmed before required-field validation; duplicate names fail with a conflict response.
- **Supprimer** is a logical deletion: the record is archived with `is_active=false`, retaining IDs, challenge links, resource links, assignments and historical assessments. Administrators can restore it. There is deliberately no cascading physical delete route.
- `/admin/skill-associations`: search/select a real developer through the existing user directory, inspect assigned skills, assign an active skill, or remove its assignment. Assignment never calls score recalculation and never writes progress/history. Duplicate assignments collapse to the same database primary key. Removal deactivates only the assignment; past measurements remain available on the skill detail/history page.
- The same associations screen selects a real challenge, loads its full skill list and existing weights, supports several links, edits weights 1–3, and unlinks skills. **Enregistrer les liens** replaces the full set in one database transaction. Invalid/duplicate/missing skills roll the change back. Archival does not force removal of existing historical links. Linking no longer assigns the administrator or launches a background score recalculation.

The existing user/admin guards, including suspended-account handling, protect all endpoints. SQL RPCs independently check the authenticated actor's active administrator role; clients cannot nominate an actor, price, score or proficiency. The service-role client stays server-side, and direct public/authenticated writes to assignments and execution of mutation RPCs are revoked.

## Developer flows and scoring

- `/my-skills` and dashboard: assigned skills, technology/category labels, actual score/status, progression indicators and radar where applicable. Assignment with no measured result is **Non évaluée**; it is not rendered as a zero score. Old historical measurements alone do not reactivate an explicitly removed assignment.
- `/skills/[id]`: reads the requested skill independently of current assignment, so past measured scores and assessment history remain viewable after unassignment or archival. Unassessed legacy history rows with zero validated attempts are excluded from the displayed assessment chart.
- `/discover` remains the real Technologies catalogue; it works independently of the developer's assignments and opens each technology's active skills.
- `/arena` now reads real published database challenges and their associated skill names. The old hard-coded challenge list with invented validation states was removed. Associated skill links lead to skill history and available practice challenges.
- Browser practice is explicitly labelled as training and does not send attempts, scores or validation requests. Skill-card practice links open the actual skill/challenge list instead of constructing fake challenge IDs.
- The existing `skills-v1` scoring function, validated-attempt query and event workflow remain in place. Catalogue/assignment/link edits do not modify historical snapshots. Administrative simulation endpoints remain restricted to administrators, but simulation and artificial score controls are removed from the association/catalogue UI.
- Knowledge completion and Marketplace purchases/equipping/hints do not call scoring or assignment mutation code. Their existing tables/IDs/RPCs are not replaced. BYTE navigation targets and its existing saved-step migration remain intact.

## Endpoints added or completed

| Endpoint | Permission / behavior |
| --- | --- |
| `DELETE /admin/skills/:id` | Admin; archive, preserving references |
| `DELETE /admin/technologies/:id` | Admin; archive, preserving references |
| `PATCH /admin/technologies/:id` | Existing admin edit, now exposed in UI |
| `GET /admin/developers/:userId/skills` | Admin; active assignments |
| `POST /admin/developers/:userId/skills/:skillId` | Admin; idempotent assignment, no score payload |
| `DELETE /admin/developers/:userId/skills/:skillId` | Admin; deactivate assignment |
| `GET /me/skill-assignments` | Current authenticated identity only |
| `GET /skills/:id` | Authenticated skill metadata, including archived records for history |
| `GET /skill-challenges` | Authenticated published challenge/skill directory |
| `PUT /admin/challenges/:id/skills` | Existing route; atomic weighted full replacement |

## Verification

Executed successfully:

- Backend build and **189 tests across 12 suites**, including new HTTP checks for 401/403, current-user reads, administrator actor identity, UUID validation, logical deletion and trimmed required fields. The scoring integration test changes from unassessed to measured 80% using validated attempts and the existing scoring calculation.
- Isolated PostgreSQL: `node db/tests/skills-management.cjs`. This checks assignment authorization/idempotence, no fabricated progress/history, unassignment and archival preservation, FK protection, normalized duplicate rejection, multi-skill weights/unlinking, atomic rollback of invalid link replacement, migration replay and RLS/function privileges. It also applies the real Marketplace and Knowledge migrations to the same fixture, performs an actual database purchase/equip and learning completion, and confirms the existing measured score/history stay unchanged. The fixture schema is checked in under `db/tests/fixtures/skills-host.sql`. As with existing SQL verifiers, PGlite is installed only under `.local/verification`.
- Frontend ESLint, TypeScript, Skills API, BYTE, Knowledge, Marketplace and PWA regressions. The production compiler, type checker and all route prerenders completed; Next.js's existing security-version check returned a nonzero exit afterward. Upgrade the existing Next.js version separately; this integration does not silently change framework dependencies.

No shared-database migration, external account creation, push or deployment was performed. Live/browser layout and real Supabase end-to-end verification remain outstanding. The pre-existing deleted recovery email template still interrupts the combined frontend auth script; it is unrelated to these changes. Existing unrelated working-tree changes/deletions were preserved.

Start normally in CMD, with one terminal per service:

```cmd
cd /d D:\devarena\DEVARENA\backend
npm run start:dev
```

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run dev
```

Use an existing administrator account for catalogue/association management and a developer account to view assigned, measured and unassessed skills.
