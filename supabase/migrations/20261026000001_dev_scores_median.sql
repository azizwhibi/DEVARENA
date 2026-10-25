-- Migration: 20261026000001_dev_scores_median.sql
-- Implements dev_scores SQL view (median-based), leaderboard() function, and my_rank() function.
begin;
set local lock_timeout = '10s';

-- 1. Create or replace view dev_scores
create or replace view public.dev_scores as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.country,
  p.institution,
  p.institution_key,
  p.visibility,
  p.status,
  percentile_cont(0.5) within group (order by usp.level_score) as dev_score,
  count(usp.skill_id)::int as skill_count,
  max(usp.updated_at) as score_reached_at,
  case
    when percentile_cont(0.5) within group (order by usp.level_score) >= 85 then 'expert'
    when percentile_cont(0.5) within group (order by usp.level_score) >= 65 then 'advanced'
    when percentile_cont(0.5) within group (order by usp.level_score) >= 35 then 'intermediate'
    else 'beginner'
  end as tier,
  'median-v1' as scoring_version,
  (p.visibility = 'public' and p.status = 'active' and count(usp.skill_id) >= 1) as eligible
from public.profiles p
left join public.user_skill_progress usp
  on usp.user_id = p.id and usp.validated_attempts >= 1
where p.role = 'developer'
group by p.id, p.username, p.avatar_url, p.country, p.institution, p.institution_key, p.visibility, p.status;

-- 2. Create function leaderboard
create or replace function public.leaderboard(
  p_scope text default 'global',
  p_value text default null,
  p_limit int default 20,
  p_offset int default 0
) returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  country char(2),
  institution text,
  dev_score numeric,
  tier text,
  total bigint
)
language plpgsql security definer set search_path = 'public' as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset int := greatest(0, coalesce(p_offset, 0));
begin
  if p_scope = 'technology' and p_value is not null then
    -- Technology scope: compute median across skills of specified technology
    return query
    with tech_scores as (
      select
        p.id as t_user_id,
        p.username as t_username,
        p.avatar_url as t_avatar_url,
        p.country as t_country,
        p.institution as t_institution,
        percentile_cont(0.5) within group (order by usp.level_score)::numeric as t_score,
        max(usp.updated_at) as t_reached_at,
        case
          when percentile_cont(0.5) within group (order by usp.level_score) >= 85 then 'expert'
          when percentile_cont(0.5) within group (order by usp.level_score) >= 65 then 'advanced'
          when percentile_cont(0.5) within group (order by usp.level_score) >= 35 then 'intermediate'
          else 'beginner'
        end as t_tier
      from public.profiles p
      join public.user_skill_progress usp
        on usp.user_id = p.id and usp.validated_attempts >= 1
      join public.skills s
        on s.id = usp.skill_id and s.technology_id = p_value::uuid
      where p.role = 'developer'
        and p.visibility = 'public'
        and p.status = 'active'
      group by p.id, p.username, p.avatar_url, p.country, p.institution
    ),
    ranked as (
      select
        row_number() over (order by ts.t_score desc nulls last, ts.t_reached_at asc, ts.t_user_id asc) as r_rank,
        ts.t_user_id,
        ts.t_username,
        ts.t_avatar_url,
        ts.t_country,
        ts.t_institution,
        ts.t_score,
        ts.t_tier,
        count(*) over() as r_total
      from tech_scores ts
    )
    select
      r.r_rank,
      r.t_user_id,
      r.t_username,
      r.t_avatar_url,
      r.t_country,
      r.t_institution,
      round(r.t_score, 2),
      r.t_tier,
      r.r_total
    from ranked r
    order by r.r_rank asc
    limit v_limit offset v_offset;

  else
    -- Global, Country, or Institution scopes
    return query
    with filtered as (
      select
        ds.user_id,
        ds.username,
        ds.avatar_url,
        ds.country,
        ds.institution,
        ds.dev_score,
        ds.score_reached_at,
        ds.tier
      from public.dev_scores ds
      where ds.eligible = true
        and (
          p_scope = 'global'
          or (p_scope = 'country' and ds.country = upper(p_value))
          or (p_scope = 'institution' and ds.institution_key = upper(regexp_replace(btrim(p_value), '\s+', ' ', 'g')))
        )
    ),
    ranked as (
      select
        row_number() over (order by f.dev_score desc nulls last, f.score_reached_at asc, f.user_id asc) as r_rank,
        f.user_id as r_user_id,
        f.username as r_username,
        f.avatar_url as r_avatar_url,
        f.country as r_country,
        f.institution as r_institution,
        f.dev_score as r_dev_score,
        f.tier as r_tier,
        count(*) over() as r_total
      from filtered f
    )
    select
      r.r_rank,
      r.r_user_id,
      r.r_username,
      r.r_avatar_url,
      r.r_country,
      r.r_institution,
      round(r.r_dev_score, 2),
      r.r_tier,
      r.r_total
    from ranked r
    order by r.r_rank asc
    limit v_limit offset v_offset;
  end if;
end;
$$;

-- 3. Create function my_rank
create or replace function public.my_rank(
  p_user_id uuid,
  p_scope text default 'global',
  p_value text default null
) returns table (
  rank bigint,
  dev_score numeric,
  tier text,
  eligible boolean
)
language plpgsql security definer set search_path = 'public' as $$
begin
  if p_scope = 'technology' and p_value is not null then
    return query
    with tech_scores as (
      select
        p.id as t_user_id,
        percentile_cont(0.5) within group (order by usp.level_score)::numeric as t_score,
        max(usp.updated_at) as t_reached_at,
        case
          when percentile_cont(0.5) within group (order by usp.level_score) >= 85 then 'expert'
          when percentile_cont(0.5) within group (order by usp.level_score) >= 65 then 'advanced'
          when percentile_cont(0.5) within group (order by usp.level_score) >= 35 then 'intermediate'
          else 'beginner'
        end as t_tier,
        (p.visibility = 'public' and p.status = 'active') as t_eligible
      from public.profiles p
      join public.user_skill_progress usp
        on usp.user_id = p.id and usp.validated_attempts >= 1
      join public.skills s
        on s.id = usp.skill_id and s.technology_id = p_value::uuid
      where p.role = 'developer'
      group by p.id, p.visibility, p.status
    ),
    ranked as (
      select
        ts.t_user_id,
        case
          when ts.t_eligible then row_number() over (
            partition by ts.t_eligible
            order by ts.t_score desc nulls last, ts.t_reached_at asc, ts.t_user_id asc
          )
          else null
        end as r_rank,
        ts.t_score,
        ts.t_tier,
        ts.t_eligible
      from tech_scores ts
    )
    select
      r.r_rank,
      round(r.t_score, 2),
      r.t_tier,
      r.t_eligible
    from ranked r
    where r.t_user_id = p_user_id;

  else
    return query
    with scoped as (
      select
        ds.user_id,
        ds.eligible,
        ds.dev_score,
        ds.tier,
        ds.score_reached_at
      from public.dev_scores ds
      where (
        p_scope = 'global'
        or (p_scope = 'country' and ds.country = upper(p_value))
        or (p_scope = 'institution' and ds.institution_key = upper(regexp_replace(btrim(p_value), '\s+', ' ', 'g')))
      )
    ),
    ranked as (
      select
        s.user_id,
        case
          when s.eligible then row_number() over (
            partition by s.eligible
            order by s.dev_score desc nulls last, s.score_reached_at asc, s.user_id asc
          )
          else null
        end as r_rank,
        s.dev_score,
        s.tier,
        s.eligible
      from scoped s
    )
    select
      r.r_rank,
      round(r.dev_score, 2),
      r.tier,
      r.eligible
    from ranked r
    where r.user_id = p_user_id;
  end if;
end;
$$;

-- 4. Set permissions
revoke all on public.dev_scores from public, anon, authenticated;
grant select on public.dev_scores to authenticated, anon, service_role;

revoke all on function public.leaderboard(text, text, int, int) from public, anon, authenticated;
grant execute on function public.leaderboard(text, text, int, int) to service_role, authenticated, anon;

revoke all on function public.my_rank(uuid, text, text) from public, anon, authenticated;
grant execute on function public.my_rank(uuid, text, text) to service_role, authenticated, anon;

commit;
