# Spec: `practice-scoring` — Score Calculation from Practice Challenges and Offline Battle Duels

**Module ID:** `practice-scoring` (from [capability-map-scores-and-invitations.md](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map-scores-and-invitations.md))  
**Depends on:** `scoring` (completed in Checkpoint K)

---

## Objective

Ensure that all developer activity — including standalone **practice challenges** in [`ChallengeModal.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/skills/arena/ChallengeModal.tsx) and **offline/solo battle duels** against DevBot in [`DuelArena.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/duel/DuelArena.tsx) — counts toward verified skill progression and updates the developer's aggregate Median Dev Score.

### Who benefits
- **Developers** can level up their skills and increase their Dev Score through practice challenges and solo battles, rather than only formal multiplayer duels.
- **The Platform** eliminates discrepancies where users practice but see 0 progress or unranked status.

### Success looks like
- Solving a practice challenge in `ChallengeModal.tsx` records an attempt with `accuracy: 1.0` (or `0.0`), immediately recalculating the linked skills' `level_score` via `computeLevel()` and updating the developer's overall Dev Score.
- Completing a solo practice duel battle against DevBot calculates the player's round accuracy (`correctAnswers / totalQuestions`) and records it to the scoring engine, updating their Dev Score upon battle conclusion.

---

## Tech Stack

- **Backend:** NestJS 11, `@nestjs/event-emitter`, PostgreSQL
- **Frontend:** Next.js 16.4, React 19, TypeScript
- **Existing Events:** `ATTEMPT_VALIDATED` triggering `AttemptValidatedListener` → `SkillProgressService.recalculate()`

---

## Detailed Changes

### 1. Developer Attempt API: `POST /me/challenges/:challengeId/attempt`

**File:** [`backend/src/skills/me-skills.controller.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/backend/src/skills/me-skills.controller.ts)

Add an endpoint accessible by authenticated developers (`UserGuard`):

```typescript
@Post('challenges/:challengeId/attempt')
@HttpCode(200)
async recordMyAttempt(
  @Req() req: AuthedRequest,
  @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
  @Body() body?: { isSuccess?: boolean; accuracy?: number },
) {
  const userId = req.user!.id;
  const isSuccess = body?.isSuccess ?? true;
  const accuracy = body?.accuracy != null ? Number(body.accuracy) : isSuccess ? 1.0 : 0.0;
  const isValidated = Boolean(isSuccess && accuracy > 0);

  // 1. Insert attempt into attempts table
  const { error } = await this.supabase.client.from('attempts').insert({
    user_id: userId,
    challenge_id: challengeId,
    accuracy,
    is_validated: isValidated,
  });
  if (error) throw error;

  // 2. Emit ATTEMPT_VALIDATED event if validated
  if (isValidated) {
    this.events.emit(
      ATTEMPT_VALIDATED,
      new AttemptValidatedEvent(userId, challengeId),
    );
  }

  return {
    success: true,
    challengeId,
    userId,
    isSuccess: isValidated,
    accuracy,
  };
}
```

### 2. Practice Challenges Submission in `ChallengeModal.tsx`

**File:** [`nextjs/src/components/skills/arena/ChallengeModal.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/skills/arena/ChallengeModal.tsx)

- In `handleSubmit()`:
  - If challenge has a `challengeId`: call `apiRequest('/me/skills/challenges/' + challengeId + '/attempt', { method: 'POST', body: JSON.stringify({ isSuccess, accuracy: isSuccess ? 1.0 : 0.0 }) })`.
  - Provide positive UI feedback: `"Correct! Your skill progress and Dev Score have been updated."`
  - Dispatch a window event `skill-progress-updated` so the dashboard and profile re-hydrate immediately.

### 3. Solo DevBot Battle Duel Submission in `useQuizDuel.ts` & `DuelArena.tsx`

**File:** [`nextjs/src/hooks/useQuizDuel.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/hooks/useQuizDuel.ts)

- When a solo duel concludes (`phase === 'finished'`):
  - Compute player performance:
    `accuracy = p.roundScores.length > 0 ? p.correctAnswers / p.roundScores.length : 0`
  - If `p.correctAnswers > 0`:
    Call backend attempt endpoint with the duel challenge ID (or default practice challenge UUID) to record the battle attempt.
  - Dispatch `skill-progress-updated` event.

---

## Testing Strategy

- **Backend Unit Tests:** `me-skills.controller.spec.ts` verifying that `recordMyAttempt`:
  - Inserts the attempt row with `user_id = req.user.id`.
  - Emits `ATTEMPT_VALIDATED` on success.
  - Rejects unauthenticated requests with 401.
- **Build & Types:** `npm --prefix backend run build` and `npm --prefix nextjs run build`.

---

## Boundaries

- **Always:**
  - Route all score recalculations through `computeLevel()` via `AttemptValidatedListener`.
  - Validate that `accuracy` is clamped to `[0.0, 1.0]`.
- **Never:**
  - Hardcode score deltas in the frontend or backend.
