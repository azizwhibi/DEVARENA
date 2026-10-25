# Populate the catalogue and problem links

The four CSV exports are snapshots. Keep them as references; importing them again would not create the missing associations.

Your exports contain only six skills and one category. Most technologies have no skill whose `technology_id` refers to them. `Arrays` and `Hash tables` have no primary technology because they are shared concepts. The custom skill `sirine` currently points to **React**, while the separate technology `sirine` has no linked skills. These facts explain the empty Technologies panels.

## Run in Supabase SQL Editor

Use the existing project. Do not delete or recreate any table.

1. Run **01_fill_catalogue.sql**. It fills the four existing tables with 8 catalogue categories, 15 real technologies, 82 skills and 27 topics, including reused rows. All 15 real technologies get at least four skills; PostgreSQL gets six. Existing IDs and custom rows are preserved. Existing archived rows are not reactivated.
2. Import `../challenges_import_100.csv` if those 100 problems are not already present. Do not reimport existing IDs.
3. Run **02_link_problems.sql**. It connects existing problems to real topic and skill IDs using the 25 explicit categories in that CSV, plus the three original problems and selected secondary techniques. SQL problems also receive the Database topic. Existing links and weights are preserved. If problems are imported later, rerun this script.
4. **Optional for the screenshot:** run **04_optional_link_sirine.sql** if your existing skill `sirine` should belong to the technology `sirine`. It moves that existing skill from its current technology. Otherwise edit or archive the custom technology in the admin UI; the catalogue seed does not invent a programming technology called Sirine.
5. Run **03_verify_catalogue.sql** and review every result set. Refresh the Technologies and Problems pages.

The prerequisite schemas are `../skills-integration.sql` and `../problem-topics.sql`. These catalogue scripts do not replace those migrations. For problem CRUD, the separate `../problem-administration.sql` migration is still required.

## Expected examples

| Technology | Linked skills |
| --- | --- |
| Python | Python lists, dictionaries, comprehensions, generators |
| JavaScript | JavaScript arrays, closures, promises, event loop |
| PostgreSQL | SQL joins, subqueries, aggregation, window functions, filtering, dates |
| React | React components, state, effects, accessibility |
| Docker | Docker images, containers, networking, Compose |

Shared algorithm skills remain language-independent: solving a generic Arrays problem must not award a Python or JavaScript skill just because either language can solve it. The language-specific catalogue skills and the shared problem concepts are separate rows with clear meanings; no shared concept is copied once per technology.

## Preservation and replay

These scripts change catalogue data and associations only. They do not create solutions, practice completions, proficiency scores, assessment history, credits or Knowledge progress. No existing problem statement, ID, publication state or weight is overwritten. Names and slugs reuse existing rows; contradictory matches abort the transaction instead of selecting an arbitrary ID. Existing non-null skill classifications remain unchanged in script 01. The optional script 04 is the explicit exception for the supplied custom example.

Adding a skill link to a problem with historical validated attempts can make that skill appear in views that derive demonstrated skills from those attempts. No stored score or history is recalculated by these scripts.

All scripts are replay-safe. Existing inactive catalogue entries are kept inactive and shown by diagnostics; restore them explicitly in the admin UI when appropriate. Some topics can legitimately have zero published problems. Counts are derived from actual published problem links.

Only local isolated PostgreSQL tests were run by this change. **These SQL scripts have not been applied to the shared Supabase database.**

## Local verification

From the repository root in CMD:

```cmd
node db/tests/topic-catalogue.cjs
```

The test uses the existing optional `.local/verification` PGlite installation. It verifies ID reuse, all real technology cards, all 103 supplied problem classifications, correct published counts, duplicate prevention, conflict rollback, preservation of archived/custom rows and existing weights, private table permissions, and unchanged attempts/proficiency/history.
