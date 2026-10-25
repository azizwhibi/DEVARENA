# Supabase setup

Use the **same Supabase project** in `backend/.env` and `nextjs/.env`. Never reset the shared project, reseed existing accounts, or apply a development baseline over an established schema. Real credentials stay in ignored environment files.

## Fresh, disposable development project

1. Provision a Supabase project. Auth and Storage schemas must be provided by Supabase, not by application SQL.
2. Apply `migrations/20261018000000_baseline_skills_tables.sql` **only to an empty development project**. It supplies the existing profile, technology, skill, challenge, attempt and measured-progression prerequisites.
3. Read `precheck.sql`, inspect its results, then apply the remaining foundational migrations in filename order:
   - `20261018000001_identity_profiles.sql`
   - `20261018000002_identity_deletion.sql`
   - `20261018000003_identity_hardening.sql`
   - `20261019000001_profile.sql`
   - `20261019000002_user_admin.sql`
   - `20261019000003_oauth_email_hardening.sql`
4. Apply additive module scripts from the repository root `db/`, in this order: `skills-integration.sql`, `skills-management.sql`, `problem-topics.sql`, `problem-administration.sql`, `knowledge-management.sql`, `marketplace-integration.sql`, `duel-integration.sql`.
5. Optional examples are separate: `seed/technologies.sql`, `db/syrine-skills-data.sql`, `db/problem-topics-seed.sql`, `db/knowledge-example-resources.sql`, `db/marketplace-seed.sql`. Review source identities and associations first. Imports are not achievements or balances. Publish only reviewed drafts.
6. Register accounts normally. An authorized project administrator must assign the administrator role using the existing identity administration convention. Do not let clients self-promote through signup metadata. The optional `backend/scripts/seed-roles.mjs` creates/updates development demo accounts; review it before executing it against a dedicated development project. It was not run for this review.

## Existing shared project

Inspect migration history, columns, constraints and existing data first. Skip the baseline. Apply only reviewed missing migrations; preserve accounts, UUIDs, attempts, progression, purchases and ownership. Duplicate legacy skill/technology names need a reviewed repair before their normalized unique indexes can be added. Do not delete history to satisfy an index.

The restored identity files come from this repository's existing committed setup. Restoring files does not apply SQL or change the running Supabase project. Independently timestamped Supabase migration histories must be reconciled before using `supabase db push`; do not blindly push this directory.

## Authentication and email

Set Site URL to the intended frontend origin. Allow its `/auth/callback` redirect, including `http://localhost:3001/auth/callback` for local development. Follow `docs/supabase-auth-setup.md` for OAuth providers.

In Supabase Authentication email templates, configure `templates/confirmation.html` and `templates/recovery.html`. The recovery link uses `RedirectTo` (the callback supplied by the application), `TokenHash`, `type=recovery`, and `next=/reset-password`. Do not replace it with the legacy confirmation URL. Configure a working SMTP provider and test delivery, expiration, password update and sign-out with an authorized account. A local template test cannot verify email delivery or hosted dashboard settings.

## Verification boundaries

`db/tests/*.cjs` use isolated PGlite fixtures under `.local/verification`; they never contact Supabase. They establish PostgreSQL behavior, not live GoTrue/Storage enforcement. Live schema application, email configuration, real device installation, OAuth providers and authorized multi-account operations require separate confirmation of their actual deployment state. This review applied no migrations or seeds to shared Supabase.
