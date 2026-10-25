# Spec: `scoring` — Dynamic Scoring & Median Dev Score

**Module ID:** `scoring` (from [capability-map.md](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map.md))  
**Maps to:** `todo.md` tasks T22–T26 (rankings phase) + inline fix in `skill-progress.service.ts`  
**Depends on:** — (standalone)

---

## Objective

1. **Eliminate the static ±6% delta scoring path** (`applyAttemptResult()`) that bypasses the authoritative `computeLevel()` formula. Every challenge attempt — whether submitted from the frontend, an admin tool, or a duel — must flow through the same weighted-average `computeLevel()` pipeline so scores are deterministic and reproducible.

2. **Implement the developer overall score as a median** of per-skill `level_score` values. A developer's aggregate "Dev Score" is `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY level_score)` across all skills where the developer has ≥1 validated attempt. This replaces the originally planned `skill_part + xp_part` weighted sum in [`plan.md`](file:///D:/5SIM4/PWA/app/DEVARENA/plan.md).

3. **Expose the score** via the `dev_scores` SQL view, `leaderboard()` SQL function, `GET /rankings` API, and on `/profile`.

### Who benefits
- **Developers** see consistent, fair scores that reflect actual performance
- **Recruiters** can trust the leaderboard rankings as a genuine signal
- **Admins** don't have to debug why scores differ between the live delta and the recalculated value

### Success looks like
- A developer completes 3 challenges across 2 skills → their overall Dev Score equals the median of those 2 skill-level scores
- Repeating an already-validated challenge with a higher accuracy improves the skill score; repeating with a lower accuracy does not regress it
- No code path exists that applies a hardcoded ±N delta

---

## Tech Stack

- **Backend:** NestJS 11, TypeScript 5.x, `@nestjs/event-emitter`
- **Database:** Supabase PostgreSQL 17.11
- **Frontend:** Next.js 16.4 (for profile/rankings display)
- **Existing scoring engine:** [`level.calculator.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/skills/scoring/level.calculator.ts) — `computeLevel()`, `statusFromScore()`
- **Existing config:** [`scoring.config.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/skills/scoring/scoring.config.ts) — `DIFFICULTY_WEIGHT`, `THRESHOLDS`

## Commands

```
Build:     npm --prefix backend run build
Test:      npm --prefix backend test
Lint:      npm --prefix backend run lint
Typecheck: npx tsc -p backend --noEmit
FE Build:  npm --prefix nextjs run build
FE Types:  npx tsc -p nextjs --noEmit
```

## Project Structure (scoring-relevant)

```
backend/src/skills/
  scoring/
    scoring.config.ts        → DIFFICULTY_WEIGHT, THRESHOLDS (KEPT)
    level.calculator.ts      → computeLevel(), statusFromScore() (KEPT)
    level.calculator.spec.ts → unit tests (EXTENDED)
  skill-progress.service.ts  → recalculate() KEPT, applyAttemptResult() DELETED
  events/
    attempt-validated.event.ts    → KEPT
    attempt-validated.listener.ts → KEPT (calls recalculate)
  progress-admin.controller.ts   → MODIFIED (callers of applyAttemptResult rewired)

backend/src/users/
  users.service.ts           → getProfile() fills devScore/tier from dev_scores

supabase/migrations/
  YYYYMMDD_scoring_dev_scores.sql → NEW: dev_scores view + leaderboard() + my_rank()
```

## Code Style

Follows existing codebase conventions. Example of the target scoring flow:

```typescript
// progress-admin.controller.ts — after the fix
@Post('users/:userId/challenges/:challengeId/attempt')
@HttpCode(200)
async recordAttempt(
  @Param('userId', new ParseUUIDPipe()) userId: string,
  @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
  @Body() body?: { isSuccess?: boolean; skillId?: string; accuracy?: number },
) {
  // Insert the attempt record
  const accuracy = body?.accuracy ?? (body?.isSuccess !== false ? 1.0 : 0.0);
  await this.supabase.client.from('attempts').insert({
    user_id: userId,
    challenge_id: challengeId,
    accuracy,
    is_validated: accuracy > 0,
  });

  // Emit event → AttemptValidatedListener → recalculate() for each linked skill
  this.events.emit(
    ATTEMPT_VALIDATED,
    new AttemptValidatedEvent(userId, challengeId),
  );

  return { success: true, challengeId, userId };
}
```

## Detailed Changes

### S1. Delete `applyAttemptResult()`

**File:** [`skill-progress.service.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/skills/skill-progress.service.ts#L247-L335)

- **Delete** the entire `applyAttemptResult()` method (lines 247–335)
- This removes: the ±6 delta, the hardcoded 75 starting score, the inline status thresholds, and the per-attempt history insertion that bypasses change detection

### S2. Rewire `ProgressAdminController` callers

**File:** [`progress-admin.controller.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/skills/progress-admin.controller.ts)

Both `recordAttempt` (line 49) and `simulate` (line 73) currently call `applyAttemptResult()` then separately emit `ATTEMPT_VALIDATED`. After the fix:

1. Insert the attempt row directly (the same insert `applyAttemptResult` did)
2. Emit `ATTEMPT_VALIDATED` (which triggers `AttemptValidatedListener` → `recalculate()` for every linked skill)
3. Remove the `simulate` endpoint (it was only useful for testing the static delta; `recordAttempt` with `isSuccess: true` covers the same purpose)

> [!NOTE]
> The `recalculate()` method already takes the **best** accuracy per challenge (line 166–171 of `skill-progress.service.ts`), so submitting a worse attempt never regresses the score. This is the correct behavior we're preserving.

### S3. `dev_scores` SQL View (Median)

**New migration:** `supabase/migrations/YYYYMMDD_scoring_dev_scores.sql`

```sql
CREATE OR REPLACE VIEW public.dev_scores AS
SELECT
  p.id            AS user_id,
  p.username,
  p.avatar_url,
  p.country,
  p.institution,
  p.visibility,
  p.status,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usp.level_score)
                  AS dev_score,
  COUNT(usp.skill_id) AS skill_count,
  MAX(usp.updated_at) AS score_reached_at,
  CASE
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usp.level_score) >= 85 THEN 'expert'
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usp.level_score) >= 65 THEN 'advanced'
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usp.level_score) >= 35 THEN 'intermediate'
    ELSE 'beginner'
  END             AS tier,
  'median-v1'     AS scoring_version,
  (p.visibility = 'public' AND p.status = 'active' AND COUNT(usp.skill_id) >= 1)
                  AS eligible
FROM public.profiles p
LEFT JOIN public.user_skill_progress usp
  ON usp.user_id = p.id AND usp.validated_attempts >= 1
WHERE p.role = 'developer'
GROUP BY p.id, p.username, p.avatar_url, p.country, p.institution, p.visibility, p.status;
```

### S4. `leaderboard()` + `my_rank()` SQL Functions

Same migration file. Service-role only. Technology-scoped leaderboard uses skills belonging to that technology (option b from plan.md).

### S5. `GET /rankings` API + Rankings page

Tasks T24–T26 from [`todo.md`](file:///D:/5SIM4/PWA/app/DEVARENA/todo.md). Uses `OptionalAuthGuard`. Anonymous users see the public leaderboard; authenticated users also see their own rank.

### S6. `devScore`/`tier` on profile

[`users.service.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/users/users.service.ts#L212-L213) lines 212–213 currently return `devScore: null, tier: null`. After: query `dev_scores` for the user's median and tier.

## Testing Strategy

- **Framework:** Jest (backend), custom `.mjs` scripts (frontend)
- **Unit tests:**
  - `level.calculator.spec.ts` — extended with median-related edge cases (single skill, odd/even skill count)
  - `skill-progress.service.spec.ts` — new: verify `applyAttemptResult` no longer exists, verify `recalculate()` is the sole scoring path
  - `rankings.service.spec.ts` — new: verify leaderboard pagination, scoping, tie-breaking
- **SQL tests:** `supabase/tests/rankings.sql` — verify `dev_scores` view returns correct median, tier thresholds, eligibility filtering, technology scoping
- **Integration:** `progress-admin.controller` tests verify the full attempt → event → recalculate flow
- **Coverage target:** ≥90% on scoring engine, progress service, rankings service

## Boundaries

- **Always:**
  - All scoring flows through `computeLevel()` — no exceptions
  - `dev_scores` view uses `PERCENTILE_CONT(0.5)` — the median, not average
  - Tier thresholds live in exactly one SQL `CASE` (the view) and one TypeScript function (`statusFromScore()`)
  - Private/suspended users excluded from leaderboard results
- **Ask first:**
  - Changing `DIFFICULTY_WEIGHT` or `THRESHOLDS` values
  - Adding materialized view optimization
  - Adding XP or any secondary scoring dimension
- **Never:**
  - Re-introduce any static/hardcoded score deltas
  - Store the overall dev_score in a mutable column (it's always computed on read)
  - Include duel scores in the dev_score calculation

## Success Criteria

| # | Criterion | Verification |
|---|---|---|
| SC-1 | `applyAttemptResult()` method does not exist in the codebase | `grep -r "applyAttemptResult" backend/src/` returns nothing |
| SC-2 | Recording an attempt always triggers `recalculate()` via the event system | Unit test: mock event emitter, assert `ATTEMPT_VALIDATED` is emitted on every attempt |
| SC-3 | Developer with skills scoring [80, 60, 90] → dev_score = 80 (median) | SQL test against `dev_scores` view |
| SC-4 | Developer with skills scoring [80, 60] → dev_score = 70 (median of even count) | SQL test |
| SC-5 | Developer with 0 validated attempts → `dev_score IS NULL` | SQL test |
| SC-6 | Private developer does not appear in `leaderboard()` output | SQL test |
| SC-7 | Suspended developer does not appear in `leaderboard()` output | SQL test |
| SC-8 | Repeating a validated challenge with lower accuracy does not change the score | SQL test: insert worse attempt, verify `dev_scores` unchanged |
| SC-9 | `/profile` shows the correct `devScore` and `tier` matching `dev_scores` | Manual + API test |
| SC-10 | `GET /rankings` returns paginated results with correct `me` rank | Unit test + manual |

## Open Questions

None — all assumptions confirmed in capability map review.
