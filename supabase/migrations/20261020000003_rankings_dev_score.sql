-- Migration: 20261020000003_rankings_dev_score.sql
-- Moteur de Rankings & Dev Score Engine - Vue de classement et calcul algorithmique
begin;
set local lock_timeout = '10s';

-- 1. Vue de classement et calcul algorithmique du Dev Score
create or replace view public.v_dev_rankings as
with duel_stats as (
  select
    p.id as profile_id,
    count(dm.id) filter (where dm.winner_id = p.id)::integer as matches_won,
    count(dm.id)::integer as total_matches
  from public.profiles p
  left join public.duel_matches dm
    on dm.player1_id = p.id or dm.player2_id = p.id
  group by p.id
),
attempt_stats as (
  select
    p.id as profile_id,
    coalesce(round(avg(a.accuracy)::numeric, 4), 0.0000)::numeric as avg_accuracy,
    count(a.id) filter (where a.is_validated = true)::integer as validated_attempts
  from public.profiles p
  left join public.attempts a
    on a.user_id = p.id
  group by p.id
),
scored_profiles as (
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.country,
    p.institution,
    p.institution_key,
    p.visibility,
    p.status,
    p.created_at,
    coalesce(p.xp, 0)::integer as xp,
    coalesce(ds.matches_won, 0)::integer as matches_won,
    coalesce(ds.total_matches, 0)::integer as total_matches,
    coalesce(att.avg_accuracy, 0.0000)::numeric as avg_accuracy,
    coalesce(att.validated_attempts, 0)::integer as validated_attempts,
    greatest(0,
      coalesce(p.xp, 0)
      + (coalesce(ds.matches_won, 0)::integer * 25)
      + round(coalesce(att.avg_accuracy, 0.0)::numeric * 100)::integer
    )::integer as dev_score
  from public.profiles p
  left join duel_stats ds on ds.profile_id = p.id
  left join attempt_stats att on att.profile_id = p.id
  where p.status = 'active'
)
select
  user_id,
  username,
  avatar_url,
  country,
  institution,
  institution_key,
  visibility,
  status,
  created_at,
  xp,
  matches_won,
  total_matches,
  avg_accuracy,
  validated_attempts,
  dev_score,
  case
    when dev_score >= 2500 then 'Grandmaster'
    when dev_score >= 1500 then 'Master'
    when dev_score >= 800 then 'Diamond'
    when dev_score >= 400 then 'Gold'
    when dev_score >= 150 then 'Silver'
    else 'Bronze'
  end as tier,
  dense_rank() over (
    order by dev_score desc, xp desc, created_at asc
  )::integer as rank
from scored_profiles;

-- 2. Configuration des permissions (SELECT pour anon, authenticated, service_role)
grant select on public.v_dev_rankings to anon, authenticated, service_role;

commit;
