# Discuss integration (Musa)

Musa's discussion feature is integrated into the main DevArena application. The implementation reuses the source module's `community_*` tables, REST paths, DTOs and frontend API contracts. The sidebar label is **Discuss**; its existing route family remains `/community`.

Existing Supabase Auth, `profiles`, sessions, account provider, guards and API wrapper are reused. No registration, login, profile-management, direct messaging or user-administration implementation was copied from the source project. Existing developer, recruiter and administrator accounts use the feature through the same login.

## Features

- All posts, own posts and private saved posts.
- Publish, edit and archive posts. Authors own their posts; administrators can moderate them.
- Search, category/tag filtering, newest/top-voted/most-discussed sorting and pagination. Feed filters remain in the URL.
- Upvotes/downvotes, with one vote per account and post.
- Comments and one level of replies. Deleted or hidden parent comments become tombstones when visible replies remain.
- A discussion author can select or unselect a visible answer from that discussion.
- Reports for posts or comments, a private administrator report queue, moderation history, category creation/editing/archival/restoration, and post pin/lock/hide/restore actions.
- Optional API links to existing published problems and Knowledge resources.

Posts are rendered as escaped text with preserved line breaks. Submitted HTML is never executed. Category descriptions and the frontend use English. Components share the current dark/violet theme, responsive layout, focus indicators and lucide line icons. There are no duplicated create-post banners or extra login screens.

Discussion votes, comments and selected answers never create problem completions, verified assessments, skill proficiency, Knowledge completion or Marketplace credits.

## Required database setup

Run **`db/community-integration.sql`** in the existing Supabase project's SQL Editor. The same script is mirrored at `supabase/migrations/20261025000001_community_forum.sql` for migration-based setup. Use either path; they contain identical SQL.

The existing `profiles` table (including role/status) and `challenges` table are prerequisites. The optional resource link uses the existing `knowledge_resources` table when installed. The script creates or upgrades discussion tables only and does not replace identity or other module schemas. It seeds seven discussion categories, not fake users or posts. Replaying it preserves existing content.

Browser roles have no direct access to discussion tables or functions. RLS is enabled and grants are service-role only. Every mutation goes through the existing NestJS guards; transactional database functions independently check the current actor's active profile, ownership and administrator role. Authors, votes and bookmarks are always bound to the authenticated identity, not a submitted user ID.

Musa's temporary in-memory fallback was removed. A missing migration or database outage returns an error instead of claiming a post was saved. Posts, topics, votes, comments, saved entries, reports and moderation logs persist in Supabase. Post/tag edits, voting, bookmarking and answer selection are transactional. Triggers maintain discussion counters during existing account-deletion cascades as well.

**The migration has been verified in isolated PostgreSQL but has not been applied to the shared Supabase database by this integration.** Until it is applied, the interface displays a setup error and cannot persist discussions.

## Run and try it (CMD)

Use the main application folders and the existing environment files; no additional key or dependency is required.

```cmd
cd /d D:\devarena\DEVARENA\backend
npm run start:dev
```

In a second CMD terminal:

```cmd
cd /d D:\devarena\DEVARENA\nextjs
npm run dev
```

Open `http://localhost:3001`, sign in using an existing account, and choose **Discuss → New post**. Another existing account can vote, save and reply. Administrators use **Discuss moderation** in the same sidebar. Announcements can be created only by administrators. Hidden/archived posts are excluded from public feeds and saved lists; the author can still see their own posts, and administrators can restore them.

Post deletion is archival. Comment deletion removes its content and preserves visible replies when needed. Category deletion is archival and never deletes its existing posts. Reports are capped at the latest 200 per selected status and moderation history at the latest 100 actions. Source data and the integration SQL are preserved under the main application; the source `musaGestion` folder is not a runtime dependency.

## Verification

```cmd
node db/tests/community.cjs
cd backend
npm test -- --runInBand
npm run build
cd ..\nextjs
npm run lint
npm run build
npm run test:auth
```

The database verifier uses the existing optional `.local/verification` PGlite installation, with no network or shared credentials. It checks post/tag persistence, atomic edits, votes, bookmarks, comment relationships, answer selection, reports, author/admin/suspension boundaries, locks, hidden-content visibility, category restore, migration replay, RLS, account-deletion counters and unchanged profiles/assessments.

Browser verification used the actual Discuss components with isolated PostgreSQL fixtures: publish/edit, reload persistence, upvote/save, comments/replies/selected answer, reports, moderator hide/restore and category archive/restore. Desktop, 390px and 320px layouts were checked for horizontal overflow. Test fixtures were not inserted into the shared project.
