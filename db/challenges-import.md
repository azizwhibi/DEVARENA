# Import the new problem catalogue

`challenges_import_100.csv` contains **100 new problems only**: 80 coding problems and 20 SQL problems. Use this file when the three original problems already exist in Supabase.

`challenges_rows.csv` contains the original three rows unchanged followed by the 100 new rows, for **103 total**. Use it only for an empty table or an import process that explicitly handles existing IDs. Do not import both files.

## Import

1. Open your existing Supabase project and select `public.challenges` in Table Editor.
2. Open its CSV import action and select `db/challenges_import_100.csv`.
3. Keep the column mapping exactly as provided. The file uses the same ten columns as your export.
4. Treat empty CSV fields as SQL `NULL`, particularly `coding_version_id`. Do not replace these with made-up UUIDs, the text `NULL`, or an empty-string UUID.
5. Confirm the preview contains **100 new records**, then import once.
6. Refresh DevArena's Problems page. The new rows have `is_published=true` and appear alongside the original three.

IDs and slugs are stable and unique in this catalogue. The Table Editor may insert rather than upsert: importing the new-rows file again can produce duplicate-key errors. Keep existing records instead of deleting them to retry.

## Content and limits

- Difficulties: 32 beginner, 56 intermediate, 11 advanced, 1 expert.
- Every coding problem has a function signature, a precise statement, constraints and two examples.
- Every SQL problem specifies PostgreSQL tables, nullable fields, output columns, sorting and one populated example.
- `duration_seconds` is 900 / 1800 / 2700 / 3600 by difficulty. These are suggested problem durations, not code execution limits.
- New `coding_version_id` fields are deliberately blank. These are statement records for the current Gemini review flow, not new executable judge versions. They do not include starter-code bundles, hidden tests, reference solutions or accepted-submission evidence.
- `category` is a text classification. CSV import does not create `challenge_topics` or `challenge_skills` associations. To use topic filtering and show corresponding skills for these problems, link existing topics and skill IDs through the existing Problems/Associations admin interfaces. No topic, skill, score or progression records are rewritten by these CSV files.

## Checks performed

The current Supabase REST schema was read without modifying any records: all ten CSV columns exist, required columns are populated, and `coding_version_id` is nullable. CSV round-trip checks verified multiline quoting, UUIDs, title/slug uniqueness and preservation of the original rows. All 160 coding example outputs were independently checked. All 20 SQL examples were checked using queries in isolated PostgreSQL (PGlite).

**The CSV has not been imported into your shared database.** Schema inspection does not exercise every database trigger or constraint. If the import reports a custom coding-version or publication constraint, keep that constraint and provide its error before importing; executable judge versions must be configured rather than fabricated.
