# Competitive rankings and rank rewards (T53–T57)

## Objective
Implement the user's ranking brief as one feature phase, extending existing Nest rankings, skill events, multiplayer duels, Marketplace wallets and Next workspace. No new packages, hosting changes or production migration execution. The user's request authorizes this phase; commit/push and the next phase remain subject to AGENTS.md Rule 11.

## Rules
- Competitive points = round(duel_rating * 0.6 + median Dev Score * 15). Mastery XP is separate and does not change this formula.
- Elo starts at 1200, floors at 800; K is 40 before 15 games, otherwise 32 below 2000 and 20 above. Sweep means winning more than eight rounds, excluding forfeits. Draw = 0.5, win = 1 (sweep 1.1), loss = 0. Both players use pre-match ratings/counts. Only server-resolved multiplayer matches affect Elo.
- Bronze/Silver/Gold/Platinum/Diamond/Master start at 0/1200/1500/1800/2200/2600 and grant 100/250/500/1000/2500/5000 credits once each. Reaching a tier grants unclaimed lower milestones including Bronze. The reward table takes precedence over the sample RPC's omission of Bronze. A user preference question is pending; adjust if answered differently.
- Divisions III/II/I split each finite tier into equal point bands; Master is Elite.
- Mastery = round(base * accuracy * first-clear multiplier), base 100/250/500/1000 for beginner/intermediate/advanced/expert, first clear 1.5, subsequent clears 1. Attempts process once with persistent uniqueness and serialized first-clear detection.
- Public leaderboard includes active public developers only. Private users see own points without public rank. Scope ranking occurs before search/pagination. Country/institution default to caller profile; absent values yield empty results. Technology includes evaluated developers in that technology while preserving the global formula.
- SQL owns competitive tiers, progress and rewards. Writes/RPCs are service-role only with RLS, empty SECURITY DEFINER search_path, qualified identifiers. Ledger insert/wallet increment are atomic. Persistent match deduplication and deterministic player locks prevent replay/lost updates.
- Skill recalculation completes before reward checks. No Elo or competitive credit rewards from self-reported solo practice. Challenge awards use server validation of submitted answers, never client success/accuracy claims. Preserve existing RFC-7807 and suspension enforcement.

## Contracts
T58 regression clarification: `/me/profile` exposes optional `competitivePoints`, `competitiveTier`, and `duelRating` from the existing service-only competitive leaderboard view. Median `devScore` and proficiency `tier` retain their meaning. The profile displays both, and a matching authoritative `DUEL_RATING_UPDATED` refreshes shared account data and the Next route cache. Background refresh failures preserve the displayed account; older requests cannot overwrite newer profile updates. Solo battles remain unranked.

GET /rankings: scope,value,search (max 120),page>=1,pageSize 1–100. Response {items,total,page,pageSize,me}. Items: rank,userId,username,avatarUrl,country,institution,devScore,tier,division,competitivePoints,duelRating,wins,matchesPlayed,winRate. me: rank,devScore,tier,division,eligible,competitivePoints,duelRating,wins,matchesPlayed,winRate,pointsToNextTier,nextTier,nextTierReward,tierProgress.

SQL RPCs (coordinate changes before implementation):
- competitive_rankings(p_scope text,p_value text,p_search text,p_limit int,p_offset int,p_user_id uuid): JSONB {items:[snake_case rows],total,me:snake_case row|null}. One snapshot preserves empty-page counts and standing.
- apply_competitive_duel(p_match_id uuid): JSONB {applied,player_a,player_b,delta_a,delta_b,rating_a,rating_b,points_a,points_b}. Reads stored duel_matches; sweep derives from rounds_data. Forfeits must be identifiable and excluded from sweep.
- grant_attempt_mastery(p_attempt_id uuid): JSONB {awarded,mastery_points,first_clear,total_mastery_points}; only authoritative validated practice attempts qualify.
- check_and_grant_rank_reward(p_user_id uuid): JSONB {awarded,tier,credits_awarded,new_balance,rewards:[{tier,credits_awarded}]}. Concurrency/replay safe, duplicates return awarded:false.
- RankRewardListener checks rewards after skill recalculation and duel.finished; emits rank.promoted {userId,tier,credits_awarded,new_balance,rewards}. Existing duel gateway sends private {event:'rank_promoted',data:{...}}. Challenge response includes masteryPoints and rankReward; browser dispatches rank_promoted.
- Each duel socket receives {type:'DUEL_RATING_UPDATED',payload:{duelId,delta,rating,competitivePoints}}; frontend renders only the matching match result.

## Structure, commands and style
Migration: supabase/migrations/20261027000001_rankings_and_rewards.sql; assertions: supabase/tests/rankings.sql. Existing db/marketplace-integration.sql and db/duel-integration.sql are prerequisites (wallet has updated_at and a balance ceiling).
Backend: rankings service/listener/specs, duel integration, skill answer validation/response. Frontend: /rankings, workspace shell, promotion notification, DuelArena/ChallengeModal. Reuse API/SSR/auth helpers. Never log raw upstream errors or secrets.
Tests: failing test first, verify Red then Green. Elo edges/floor, duplicate delivery, grant uniqueness/rollback, privacy/scopes/search/pagination, recalc-before-reward, rejection of client-claimed awards, UI loading/error/empty and server response rendering.
Commands: npm --prefix backend test -- rankings --runInBand; npm --prefix backend test -- --runInBand; npm --prefix backend run build; npm --prefix nextjs run test:auth; npx tsc -p backend --noEmit; npx tsc -p nextjs --noEmit; npm --prefix nextjs run build. SQL assertions on available local/dev PostgreSQL; browser smoke when tools available. Record unverified checks truthfully. Refresh Graphify excluding secrets/build/dependencies, inspect integrity.

## Completion
Independent test-engineer, security-auditor and code-reviewer receipts, exact files/commands/risks review receipt. Never mark approval or push without human approval.
