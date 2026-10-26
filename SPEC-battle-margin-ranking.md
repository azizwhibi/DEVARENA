# Spec: `battle-margin-ranking` — Battle Score-Margin Ranking Adjustment & Persistence

**Module ID:** `battle-margin-ranking`  
**Status:** APPROVED by the user ("i approve") after specification review. Implementation plan and task breakdown pending review.  
**Parent / Related Specs:** [`SPEC-competitive-rankings.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-competitive-rankings.md), [`SPEC-duel-ranking-recovery.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-duel-ranking-recovery.md)  
**Author:** Antigravity AI Engineering Assistant (Spec-Driven Development)  

---

## 1. Objective

When two developers compete in a 1v1 quiz battle (multiplayer duel), the match resolves with an authoritative end-of-battle quiz score for each participant (from 0 to 10,000 points, calculated over 10 rounds based on accuracy and speed).

Under this specification:
1. **Authoritative Rank Point Recalculation:** At the conclusion of the battle, each player's rank standing is updated in PostgreSQL. The winner gains rating points added to their rank; the loser has rating points deducted (with a protective floor at 800 Elo / 0 Competitive Points).
2. **Margin of Victory ("Big Difference") Bonus:** If a developer wins by a substantial score difference:
   - **Dominant Win:** Score differential $\ge 2,500$ battle points grants a **+25% bonus** to the winner's rating gain.
   - **Blowout / Sweep:** Score differential $\ge 5,000$ battle points grants a **+50% bonus** to the winner's rating gain.
   - Forfeits / disconnects receive standard victory credit without margin multipliers to prevent exploit farming.
3. **Asymmetric Loser Protection:** To ensure an encouraging competitive progression and avoid discouraging newer developers, the loser only incurs the standard expected Elo deduction (no blowout loss multiplier penalty), bounded strictly by the 800 minimum rating floor.
4. **Authoritative Database Persistence:** The match outcome, round breakdowns, score differential, rating deltas, and resulting competitive points are atomically written to `public.duel_matches`, `public.user_rank_stats`, and `public.competitive_duel_results` via the security-definer RPC `apply_competitive_duel(p_match_id uuid)`.
5. **Accurate Leaderboard & Profile Visibility:** The updated rating and resulting competitive points (`round(duel_rating * 0.6 + dev_score * 15)`) immediately reflect across:
   - Live duel resolution WebSocket payload (`DUEL_RATING_UPDATED`).
   - The developer's own standing card (`MyStanding`) and progress bar on `/rankings`.
   - The public competitive leaderboard table on `/rankings`.
   - The developer's `/profile` overview.

---

## 2. Mathematical Economy & Scoring Formula

### 2.1 Battle Score Range
- A duel consists of up to 10 rounds.
- Each round awards $0$ points for incorrect/timeout, or $500 + \text{round}\left(\frac{\text{timeRemainingMs}}{10000} \times 500\right)$ points for correct answers.
- Total battle score range per player: $S \in [0, 10000]$.

### 2.2 Elo Expected Probability
Given Player A rating $R_A$ and Player B rating $R_B$:
$$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
$$E_B = 1 - E_A$$

K-factor:
- $K = 40$ if `matches_played < 15` (placement / provisional phase)
- $K = 32$ if `matches_played >= 15` and $R < 2000$
- $K = 20$ if $R \ge 2000$

### 2.3 Margin of Victory Multiplier (Winner Only)
Let $S_W = \max(S_A, S_B)$ and $S_L = \min(S_A, S_B)$, with score differential $\Delta S = S_W - S_L$.
If the match is not a forfeit:
$$M_{\text{win}} = \begin{cases} 
1.50 & \text{if } \Delta S \ge 5000 \quad \text{(Blowout / Big Difference)} \\
1.25 & \text{if } \Delta S \ge 2500 \quad \text{(Dominant Margin)} \\
1.00 & \text{otherwise} \quad \text{(Standard Win)}
\end{cases}$$

If the match is won by forfeit/disconnect: $M_{\text{win}} = 1.00$.

### 2.4 Rating Delta Calculation
- **If Player A wins:**
  $$\Delta R_A = \text{round}\left(K_A \cdot (1 - E_A) \cdot M_{\text{win}}\right)$$
  $$\Delta R_B = \text{round}\left(K_B \cdot (0 - E_B)\right) \quad \text{(Asymmetric: no blowout multiplier)}$$
- **If Player B wins:**
  $$\Delta R_A = \text{round}\left(K_A \cdot (0 - E_A)\right)$$
  $$\Delta R_B = \text{round}\left(K_B \cdot (1 - E_B) \cdot M_{\text{win}}\right)$$
- **If Draw ($S_A = S_B$):**
  $$\Delta R_A = \text{round}\left(K_A \cdot (0.5 - E_A)\right)$$
  $$\Delta R_B = \text{round}\left(K_B \cdot (0.5 - E_B)\right)$$

### 2.5 Bounds & Floor
- New rating: $R' = \max(800, R + \Delta R)$.
- The actual stored delta is $\Delta R = R' - R$.
- Competitive points:
  $$\text{Competitive Points} = \text{round}(R' \cdot 0.6 + \text{DevScore} \cdot 15)$$

---

## 3. Tech Stack & Commands

### Tech Stack
- **Backend:** NestJS 11, TypeScript 5.x, `ws` (WebSockets), `@nestjs/event-emitter`, Supabase JS SDK.
- **Database:** Supabase PostgreSQL 17.11 with Row-Level Security (RLS) & PL/pgSQL security-definer RPCs.
- **Frontend:** Next.js 16.4 App Router, React Server & Client Components, CSS Modules.

### Full Executable Commands
```powershell
# Backend unit & integration tests
npm --prefix backend test -- duel-ranking duel-room rankings

# Full test suite
npm --prefix backend test -- --runInBand

# Full project typecheck
npx --prefix backend tsc -p backend --noEmit
npx --prefix nextjs tsc -p nextjs --noEmit

# Frontend automated suites
npm --prefix nextjs run test:auth
npm --prefix nextjs run test:duel

# Production builds
npm --prefix backend run build
npm --prefix nextjs run build

# Knowledge graph refresh
graphify update .
```

---

## 4. Project Structure

```
backend/src/
├── duel/
│   ├── duel.constants.ts            # Scoring formulas, round timers, safeSend
│   ├── duel.types.ts                # DuelRoomSession, payloads, rating events
│   ├── duel-room.service.ts         # Match lifecycle, persistMatchResult(), WebSocket event dispatch
│   └── duel-ranking.spec.ts         # Unit & integration tests for rating persistence & margin bonus
├── rankings/
│   ├── rankings.service.ts          # getRankings(), fallbackRankings() margin parity
│   └── rank-reward.listener.ts      # Tier promotion listener triggered by rating updates
supabase/
└── migrations/
    └── 20261027000001_rankings_and_rewards.sql  # Database schema & apply_competitive_duel RPC
nextjs/src/
├── app/(skills)/rankings/
│   ├── page.tsx                     # Server component with auth & initial data fetch
│   └── page-client.tsx              # Interactive client component (tabs, filters, pagination)
├── components/
│   ├── duel/
│   │   ├── DuelArena.tsx            # Live battle arena with real-time score display
│   │   └── DuelResultModal.tsx      # Match conclusion modal showing points gain and margin badges
│   └── rankings/
│       └── RankingsBoard.tsx        # Rankings table, MyStanding card, tier progress bar
└── lib/
    └── rankings.ts                  # Shared query builder, types, formatters
```

---

## 5. Code Style & Architecture Conventions

### Backend: Minimal Diff in `apply_competitive_duel`
```sql
-- Compute battle score difference from stored match scores
v_score_diff := abs(coalesce(m.player1_score, 0) - coalesce(m.player2_score, 0));

-- Determine margin of victory multiplier for the winner
if not m.is_forfeit and v_score_diff >= 5000 then
  v_margin_mult := 1.50; -- Blowout / Big difference win
elsif not m.is_forfeit and v_score_diff >= 2500 then
  v_margin_mult := 1.25; -- Dominant win
else
  v_margin_mult := 1.00; -- Standard win or forfeit
end if;

-- Calculate asymmetric deltas: winner enjoys margin multiplier, loser takes standard loss
if m.winner_id = m.player1_id then
  v_ra := greatest(800, a.duel_rating + round(v_ka * (1.0 - v_expected) * v_margin_mult)::int);
  v_rb := greatest(800, b.duel_rating + round(v_kb * (0.0 - (1.0 - v_expected)))::int);
elsif m.winner_id = m.player2_id then
  v_ra := greatest(800, a.duel_rating + round(v_ka * (0.0 - v_expected))::int);
  v_rb := greatest(800, b.duel_rating + round(v_kb * (1.0 - (1.0 - v_expected)) * v_margin_mult)::int);
else
  -- Draw
  v_ra := greatest(800, a.duel_rating + round(v_ka * (0.5 - v_expected))::int);
  v_rb := greatest(800, b.duel_rating + round(v_kb * (0.5 - (1.0 - v_expected)))::int);
end if;
```

### Frontend: Displaying Margin Bonus
```tsx
{/* Duel match outcome badge */}
<div className={styles.ratingChange}>
  <span className={delta >= 0 ? styles.positiveDelta : styles.negativeDelta}>
    {delta >= 0 ? `+${delta}` : delta} Rank Rating
  </span>
  {marginBonus > 0 && (
    <span className={styles.bonusBadge} title={`Won by ${scoreDifference} points`}>
      {marginBonus === 50 ? '🔥 Blowout Bonus (+50%)' : '⚡ Dominant Win (+25%)'}
    </span>
  )}
</div>
```

---

## 6. Testing Strategy

1. **Backend Unit & Contract Tests (`duel-ranking.spec.ts`):**
   - Standard win ($\Delta S < 2,500$): winner receives $1.0\times$ base Elo delta.
   - Dominant win ($2,500 \le \Delta S < 5,000$): winner receives $1.25\times$ base Elo delta.
   - Blowout win ($\Delta S \ge 5,000$): winner receives $1.50\times$ base Elo delta.
   - Asymmetric loser test: loser receives normal negative delta (no multiplier penalty applied).
   - Rating floor test: losing player with rating near 800 never drops below 800.
   - Forfeit exclusion: forfeit win never triggers the $>2,500$ or $>5,000$ multiplier even if score difference is large.
   - Deduplication / replay test: repeating `apply_competitive_duel` for the same match ID returns existing stored result without double incrementing rating or matches count.
2. **Frontend UI Contract & Scenario Tests:**
   - Verify `DUEL_RATING_UPDATED` updates account provider / rankings state without requiring full page refresh.
   - Verify `MyStanding` card renders updated competitive points and tier progress bar.
   - Verify public leaderboard table highlights user row with new points.
3. **Database Assertion Script (`supabase/tests/rankings.sql`):**
   - Transactional SQL verification ensuring correct math, locking semantics, and service-role permission enforcement.

---

## 7. Boundaries

- **Always Do:**
  - Enforce server-authoritative calculations inside PostgreSQL security-definer RPC.
  - Floor ratings strictly at 800 points.
  - Verify that both players are active `developer` profiles.
  - Return RFC-7807 problem details on REST errors and typed error envelopes over WebSocket.
  - Maintain $\ge 90\%$ test coverage on modified backend services and SQL assertions.
- **Ask First:**
  - Changing tier point boundaries (Bronze 0, Silver 1200, Gold 1500, Platinum 1800, Diamond 2200, Master 2600).
  - Introducing additional external dependencies.
  - Altering the solo Dev Score median calculation.
- **Never Do:**
  - Trust client-submitted score, win, or rating claims.
  - Permit unranked solo practice or DevBot battles to modify competitive duel ratings.
  - Double-count repeated delivery of the same match UUID.
  - Allow rating or score calculations to bypass database transactions.
  - Log or emit Supabase service-role keys or raw database credentials.

---

## 8. Success Criteria

1. [ ] A completed 1v1 battle resolves and saves `player1_score`, `player2_score`, `winner_id`, and `rounds_data` in `public.duel_matches`.
2. [ ] `apply_competitive_duel(p_match_id)` executes atomically:
   - Winner gains Elo points; if $\Delta S \ge 2,500$, winner receives $+25\%$ bonus; if $\Delta S \ge 5,000$, winner receives $+50\%$ bonus.
   - Loser loses standard Elo points without blowout penalty, floored at 800.
   - Forfeits are excluded from margin multipliers.
3. [ ] `user_rank_stats` updates `duel_rating`, `wins`, `losses`, `draws`, `matches_played`.
4. [ ] `competitive_leaderboard` view reflects the new `competitive_points = round(duel_rating * 0.6 + dev_score * 15)`.
5. [ ] Both duel clients receive `DUEL_RATING_UPDATED` with matching delta, new rating, and new competitive points.
6. [ ] Navigating to `/rankings` displays the updated score in `MyStanding` and in the leaderboard table.
7. [ ] All backend test suites (`duel-ranking`, `duel-room`, `rankings`) pass cleanly with 100% green tests.

---

## 9. Review Receipt (Phase 1: Specify)

- **Graphify Nodes & Edges Traced:**
  - `DuelRoomService.persistMatchResult`
  - `apply_competitive_duel` RPC & `competitive_duel_results` table
  - `user_rank_stats` & `competitive_leaderboard` view
  - `RankingsService.getRankings` & `RankingsBoard.tsx` (`MyStanding`)
- **Files Created:**
  - [`SPEC-battle-margin-ranking.md`](file:///D:/5SIM4/PWA/app/DEVARENA/SPEC-battle-margin-ranking.md)
- **Ponytail Discipline Check:**
  - Smallest correct change: builds directly on the existing `apply_competitive_duel` and `DUEL_RATING_UPDATED` architecture without introducing new libraries, new tables, or speculative abstractions.
  - Preserves safety floors: transactional lock, idempotent replay prevention, and 800 Elo minimum floor.
- **Next Gate:**
  - Human review and explicit approval of this specification before advancing to Phase 2 (Planning & Task Breakdown in `todo.md`).
