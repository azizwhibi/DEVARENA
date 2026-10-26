-- Recovery prerequisites and authoritative competitive ranking definitions (T67).
-- DEV TARGET ONLY: qorlygdcfwnrrzvzulcz. Review exact file before hosted execution.
-- Preserves rows; aborts on incompatible pre-existing prerequisite/table shapes.
-- Definitions copied from the existing duel integration and competitive migration.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
declare spec record; col text;
begin
  for spec in select * from (values
    ('profiles', array['id','username','avatar_url','country','institution','institution_key','visibility','status','role']),
    ('attempts', array['id','user_id','challenge_id','accuracy','is_validated','metadata']),
    ('challenges', array['id','difficulty']),
    ('skills', array['id','technology_id']),
    ('user_skill_progress', array['user_id','skill_id','level_score','validated_attempts','updated_at'])
  ) as specs(table_name,columns) loop
    if to_regclass('public.' || spec.table_name) is null then
      raise exception 'Missing prerequisite %. Reconcile baseline before ranking recovery', spec.table_name;
    end if;
    foreach col in array spec.columns loop
      if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=spec.table_name and c.column_name=col) then
        raise exception 'Missing prerequisite column %.%', spec.table_name, col;
      end if;
    end loop;
  end loop;
  if to_regclass('public.credit_wallets') is null and (to_regclass('public.wallets') is not null or exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('credits_balance','credit_balance','wallet_balance'))) then
    raise exception 'Existing credit storage requires explicit mapping before ranking recovery';
  end if;
  for spec in select * from (values
    ('credit_wallets', array['user_id','balance','updated_at']),
    ('duel_matches', array['id','player1_id','player2_id','player1_score','player2_score','winner_id','rounds_data','created_at']),
    ('user_rank_stats', array['user_id','duel_rating','matches_played','wins','losses','draws','mastery_points','highest_tier','highest_points','updated_at']),
    ('user_rank_rewards', array['id','user_id','tier','credits_awarded','awarded_at']),
    ('competitive_duel_results', array['match_id','player_a','player_b','delta_a','delta_b','rating_a','rating_b','points_a','points_b','created_at']),
    ('attempt_mastery_rewards', array['attempt_id','user_id','challenge_id','mastery_points','first_clear','created_at'])
  ) as specs(table_name,columns) loop
    if to_regclass('public.' || spec.table_name) is not null then
      foreach col in array spec.columns loop
        if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=spec.table_name and c.column_name=col) then
          raise exception 'Incompatible existing ranking table %. Missing column %', spec.table_name, col;
        end if;
      end loop;
    end if;
  end loop;
  if to_regclass('public.credit_wallets') is not null then
    if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='credit_wallets' and column_name='user_id' and data_type='uuid')
       or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='credit_wallets' and column_name='balance' and data_type='integer' and is_nullable='NO')
       or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='credit_wallets' and column_name='updated_at' and data_type='timestamp with time zone' and is_nullable='NO') then
      raise exception 'Incompatible wallet types/nullability; reconcile before recovery';
    end if;
    if not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.credit_wallets'::regclass and c.contype='p' and c.conkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.credit_wallets'::regclass and attname='user_id')]::smallint[])
       or not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.credit_wallets'::regclass and c.contype='f' and c.confrelid='public.profiles'::regclass and c.confdeltype='c' and c.conkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.credit_wallets'::regclass and attname='user_id')]::smallint[])
       or not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.credit_wallets'::regclass and c.contype='c' and c.convalidated and position('balance >= 0' in pg_catalog.pg_get_constraintdef(c.oid))>0)
       or not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.credit_wallets'::regclass and c.contype='c' and c.convalidated and position('balance <= 1000000' in pg_catalog.pg_get_constraintdef(c.oid))>0) then
      raise exception 'Incompatible wallet keys or safety constraints; reconcile before recovery';
    end if;
  end if;
end $$;

-- Existing source: supabase/migrations/20261026000001_dev_scores_median.sql
-- Migration: 20261026000001_dev_scores_median.sql
-- Implements dev_scores SQL view (median-based), leaderboard() function, and my_rank() function.

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
language plpgsql security definer set search_path = '' as $$
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
      round(r.r_dev_score::numeric, 2),
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
language plpgsql security definer set search_path = '' as $$
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
      round(r.dev_score::numeric, 2),
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

-- Minimal wallet prerequisite copied from db/marketplace-integration.sql.
-- The ranking reward function only needs this table; marketplace catalog/data is untouched.
create table if not exists public.credit_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0 and balance <= 1000000),
  updated_at timestamptz not null default now()
);
alter table public.credit_wallets enable row level security;
revoke all on public.credit_wallets from public, anon, authenticated;
grant all on public.credit_wallets to service_role;

-- Existing source: db/duel-integration.sql
-- Habib's battle result table, adapted to the existing host identities.
-- No user-management migrations, profile XP, credits, or proficiency updates.

set local lock_timeout = '10s';
create table if not exists public.duel_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  player1_score integer not null default 0 check (player1_score >= 0),
  player2_score integer not null default 0 check (player2_score >= 0),
  winner_id uuid references public.profiles(id) on delete set null,
  rounds_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_duel_matches_player1 on public.duel_matches(player1_id);
create index if not exists idx_duel_matches_player2 on public.duel_matches(player2_id);
create index if not exists idx_duel_matches_created_at on public.duel_matches(created_at desc);
alter table public.duel_matches enable row level security;
revoke all on public.duel_matches from public, anon, authenticated;
grant all on public.duel_matches to service_role;
-- Existing source policies cannot grant access without the table privileges.
-- Preserve them and existing records when integrating an already deployed table.
comment on table public.duel_matches is 'Battle Code quiz results. Separate from verified skill proficiency and Marketplace balances.';

-- Existing source: supabase/migrations/20261027000001_rankings_and_rewards.sql
-- Competitive rankings, serialized Elo and idempotent milestone credits (T53).
-- Prerequisites: existing db/duel-integration.sql and db/marketplace-integration.sql.

set local lock_timeout='10s';
alter table public.duel_matches add column if not exists is_forfeit boolean not null default false;
create table if not exists public.user_rank_stats (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 duel_rating int not null default 1200 check(duel_rating>=800),
 matches_played int not null default 0 check(matches_played>=0),
 wins int not null default 0 check(wins>=0), losses int not null default 0 check(losses>=0), draws int not null default 0 check(draws>=0),
 mastery_points bigint not null default 0 check(mastery_points>=0),
 highest_tier text not null default 'Bronze',highest_points int not null default 720,updated_at timestamptz not null default now());
create table if not exists public.user_rank_rewards (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 tier text not null check(tier in('Bronze','Silver','Gold','Platinum','Diamond','Master')),credits_awarded int not null check(credits_awarded>0),awarded_at timestamptz not null default now(),unique(user_id,tier));
create table if not exists public.competitive_duel_results (
 match_id uuid primary key references public.duel_matches(id) on delete cascade,
 player_a uuid not null references public.profiles(id) on delete cascade,player_b uuid not null references public.profiles(id) on delete cascade,
 delta_a int not null,delta_b int not null,rating_a int not null,rating_b int not null,points_a int not null,points_b int not null,
 margin_bonus_a int not null default 0,margin_bonus_b int not null default 0,created_at timestamptz not null default now());
alter table public.competitive_duel_results add column if not exists margin_bonus_a int not null default 0;
alter table public.competitive_duel_results add column if not exists margin_bonus_b int not null default 0;
create table if not exists public.attempt_mastery_rewards (
 attempt_id uuid primary key references public.attempts(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,
 challenge_id uuid not null references public.challenges(id) on delete cascade,mastery_points int not null check(mastery_points>=0),first_clear boolean not null,created_at timestamptz not null default now());
create index if not exists attempt_mastery_user_challenge_idx on public.attempt_mastery_rewards(user_id,challenge_id);
alter table public.user_rank_stats enable row level security;
alter table public.user_rank_rewards enable row level security;
alter table public.competitive_duel_results enable row level security;
alter table public.attempt_mastery_rewards enable row level security;
revoke all on public.user_rank_stats,public.user_rank_rewards,public.competitive_duel_results,public.attempt_mastery_rewards from public,anon,authenticated;
grant all on public.user_rank_stats,public.user_rank_rewards,public.competitive_duel_results,public.attempt_mastery_rewards to service_role;
create or replace view public.competitive_leaderboard as
with scores as(select p.id user_id,p.username,p.avatar_url,p.country,p.institution,p.institution_key,p.visibility,p.status,
 coalesce(s.duel_rating,1200) duel_rating,coalesce(s.wins,0) wins,coalesce(s.matches_played,0) matches_played,
 coalesce(d.dev_score,0)::numeric dev_score,
 round(coalesce(s.duel_rating,1200)*0.6+coalesce(d.dev_score,0)::numeric*15)::int competitive_points
 from public.profiles p left join public.user_rank_stats s on s.user_id=p.id left join public.dev_scores d on d.user_id=p.id
 where p.status='active' and p.role='developer')
select scores.*,case when competitive_points>=2600 then 'Master' when competitive_points>=2200 then 'Diamond' when competitive_points>=1800 then 'Platinum' when competitive_points>=1500 then 'Gold' when competitive_points>=1200 then 'Silver' else 'Bronze' end tier from scores;
revoke all on public.competitive_leaderboard from public,anon,authenticated;
grant select on public.competitive_leaderboard to service_role;
-- Close legacy bypasses of the public/private eligibility filter; backend uses service_role.
revoke all on public.dev_scores from public,anon,authenticated;
revoke all on function public.leaderboard(text,text,int,int),public.my_rank(uuid,text,text) from public,anon,authenticated;

create or replace function public.apply_competitive_duel(p_match_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.duel_matches%rowtype;a public.user_rank_stats%rowtype;b public.user_rank_stats%rowtype;v_old public.competitive_duel_results%rowtype;
 v_expected numeric;v_ka int;v_kb int;v_ra int;v_rb int;v_da int;v_db int;v_pa int;v_pb int;v_count int;v_score_diff int;v_margin_mult numeric;v_bonus_pct int;v_bonus_a int;v_bonus_b int;
begin
 select * into m from public.duel_matches where id=p_match_id;
 if not found or m.player1_id is null or m.player2_id is null or m.player1_id=m.player2_id or (m.winner_id is not null and m.winner_id not in(m.player1_id,m.player2_id)) then return jsonb_build_object('applied',false,'reason','invalid_match');end if;
 -- Same ascending profile/stats order for every overlapping match.
 perform 1 from public.profiles where id in(m.player1_id,m.player2_id) order by id for share;
 select count(*) into v_count from public.profiles where id in(m.player1_id,m.player2_id) and status='active' and role='developer';
 if v_count<>2 then return jsonb_build_object('applied',false,'reason','user_not_ranked');end if;
 insert into public.user_rank_stats(user_id) select id from public.profiles where id in(m.player1_id,m.player2_id) order by id on conflict do nothing;
 perform 1 from public.user_rank_stats where user_id in(m.player1_id,m.player2_id) order by user_id for update;
 select * into v_old from public.competitive_duel_results where match_id=p_match_id;
 if found then return (to_jsonb(v_old)-'match_id'-'created_at')||jsonb_build_object('applied',false);end if;
 select * into a from public.user_rank_stats where user_id=m.player1_id;
 select * into b from public.user_rank_stats where user_id=m.player2_id;
 v_expected:=1/(1+power(10::numeric,(b.duel_rating-a.duel_rating)::numeric/400));
 v_ka:=case when a.matches_played<15 then 40 when a.duel_rating<2000 then 32 else 20 end;
 v_kb:=case when b.matches_played<15 then 40 when b.duel_rating<2000 then 32 else 20 end;
 v_score_diff:=abs(coalesce(m.player1_score,0)-coalesce(m.player2_score,0));
 if not m.is_forfeit and v_score_diff>=5000 then
  v_margin_mult:=1.50;
  v_bonus_pct:=50;
 elsif not m.is_forfeit and v_score_diff>=2500 then
  v_margin_mult:=1.25;
  v_bonus_pct:=25;
 else
  v_margin_mult:=1.00;
  v_bonus_pct:=0;
 end if;
 if m.winner_id=m.player1_id then
  v_bonus_a:=v_bonus_pct;
  v_bonus_b:=0;
  v_ra:=greatest(800,a.duel_rating+round(v_ka*(1.0-v_expected)*v_margin_mult)::int);
  v_rb:=greatest(800,b.duel_rating+round(v_kb*(0.0-(1.0-v_expected)))::int);
 elsif m.winner_id=m.player2_id then
  v_bonus_a:=0;
  v_bonus_b:=v_bonus_pct;
  v_ra:=greatest(800,a.duel_rating+round(v_ka*(0.0-v_expected))::int);
  v_rb:=greatest(800,b.duel_rating+round(v_kb*(1.0-(1.0-v_expected))*v_margin_mult)::int);
 else
  v_bonus_a:=0;
  v_bonus_b:=0;
  v_ra:=greatest(800,a.duel_rating+round(v_ka*(0.5-v_expected))::int);
  v_rb:=greatest(800,b.duel_rating+round(v_kb*(0.5-(1.0-v_expected)))::int);
 end if;
 v_da:=v_ra-a.duel_rating;v_db:=v_rb-b.duel_rating;
 update public.user_rank_stats set duel_rating=v_ra,matches_played=matches_played+1,wins=wins+(case when m.winner_id=m.player1_id then 1 else 0 end),losses=losses+(case when m.winner_id=m.player2_id then 1 else 0 end),draws=draws+(case when m.winner_id is null then 1 else 0 end),updated_at=now() where user_id=m.player1_id;
 update public.user_rank_stats set duel_rating=v_rb,matches_played=matches_played+1,wins=wins+(case when m.winner_id=m.player2_id then 1 else 0 end),losses=losses+(case when m.winner_id=m.player1_id then 1 else 0 end),draws=draws+(case when m.winner_id is null then 1 else 0 end),updated_at=now() where user_id=m.player2_id;
 select competitive_points into v_pa from public.competitive_leaderboard where user_id=m.player1_id;
 select competitive_points into v_pb from public.competitive_leaderboard where user_id=m.player2_id;
 insert into public.competitive_duel_results(match_id,player_a,player_b,delta_a,delta_b,rating_a,rating_b,points_a,points_b,margin_bonus_a,margin_bonus_b) values(p_match_id,m.player1_id,m.player2_id,v_da,v_db,v_ra,v_rb,v_pa,v_pb,v_bonus_a,v_bonus_b);
 return jsonb_build_object('applied',true,'player_a',m.player1_id,'player_b',m.player2_id,'delta_a',v_da,'delta_b',v_db,'rating_a',v_ra,'rating_b',v_rb,'points_a',v_pa,'points_b',v_pb,'margin_bonus_a',v_bonus_a,'margin_bonus_b',v_bonus_b);
end $$;

create or replace function public.competitive_rankings(p_scope text default 'global',p_value text default null,p_search text default null,p_limit int default 20,p_offset int default 0,p_user_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
with caller as(select * from public.profiles where id=p_user_id),
scored as(select l.*,case l.tier when 'Bronze' then 0 when 'Silver' then 1200 when 'Gold' then 1500 when 'Platinum' then 1800 when 'Diamond' then 2200 else 2600 end tier_start,
 case l.tier when 'Bronze' then 1200 when 'Silver' then 1500 when 'Gold' then 1800 when 'Platinum' then 2200 when 'Diamond' then 2600 end tier_end,
 case l.tier when 'Bronze' then 'Silver' when 'Silver' then 'Gold' when 'Gold' then 'Platinum' when 'Platinum' then 'Diamond' when 'Diamond' then 'Master' end next_tier,
 case l.tier when 'Bronze' then 250 when 'Silver' then 500 when 'Gold' then 1000 when 'Platinum' then 2500 when 'Diamond' then 5000 else 0 end next_tier_reward,
 case when l.matches_played=0 then 0 else round(100.0*l.wins/l.matches_played,2) end win_rate
 from public.competitive_leaderboard l),
detailed as(select s.*,case when tier='Master' then 'Elite' when competitive_points<tier_start+(tier_end-tier_start)/3.0 then 'III' when competitive_points<tier_start+2*(tier_end-tier_start)/3.0 then 'II' else 'I' end division,
 coalesce(greatest(0,tier_end-competitive_points),0) points_to_next_tier,
 case when tier_end is null then 100 else round(100.0*(competitive_points-tier_start)/(tier_end-tier_start),2) end tier_progress from scored s),
scoped as(select d.* from detailed d where
 p_scope='global'
 or(p_scope='country' and d.country=upper(coalesce(nullif(btrim(p_value),''),(select country from caller))))
 or(p_scope='institution' and d.institution_key=upper(regexp_replace(btrim(coalesce(nullif(btrim(p_value),''),(select institution from caller))),'\s+',' ','g')))
 or(p_scope='technology' and exists(select 1 from public.user_skill_progress usp join public.skills s on s.id=usp.skill_id where usp.user_id=d.user_id and usp.validated_attempts>=1 and s.technology_id::text=p_value))),
ranked as(select row_number() over(order by competitive_points desc,user_id) rank,scoped.* from scoped where visibility='public'),
searched as(select * from ranked where nullif(btrim(p_search),'') is null or position(lower(btrim(p_search)) in lower(username))>0 or position(lower(btrim(p_search)) in lower(coalesce(institution,'')))>0),
page as(select * from searched order by rank limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,coalesce(p_offset,0))),
me as(select d.*,r.rank,(r.rank is not null) eligible from detailed d left join ranked r using(user_id) where d.user_id=p_user_id)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)-'status'-'visibility'-'institution_key'-'tier_start'-'tier_end' order by rank) from page),'[]'::jsonb),'total',(select count(*) from searched),'me',(select to_jsonb(me)-'status'-'visibility'-'institution_key'-'tier_start'-'tier_end' from me))
$$;

create or replace function public.grant_attempt_mastery(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.attempts%rowtype;v_base int;v_points int;v_first boolean;v_total bigint;
begin
 select * into a from public.attempts where id=p_attempt_id;
 if not found or not a.is_validated or a.metadata->>'source' is distinct from 'competitive_challenge' or a.metadata->'server_validated' is distinct from 'true'::jsonb then return jsonb_build_object('awarded',false,'mastery_points',0,'first_clear',false,'total_mastery_points',0);end if;
 perform 1 from public.profiles where id=a.user_id and status='active' and role='developer' for share;
 if not found then return jsonb_build_object('awarded',false,'mastery_points',0,'first_clear',false,'total_mastery_points',0);end if;
 insert into public.user_rank_stats(user_id) values(a.user_id) on conflict do nothing;
 select mastery_points into v_total from public.user_rank_stats where user_id=a.user_id for update;
 if exists(select 1 from public.attempt_mastery_rewards where attempt_id=p_attempt_id) then return jsonb_build_object('awarded',false,'mastery_points',0,'first_clear',false,'total_mastery_points',v_total);end if;
 select case difficulty when 'beginner' then 100 when 'intermediate' then 250 when 'advanced' then 500 when 'expert' then 1000 end into v_base from public.challenges where id=a.challenge_id;
 if v_base is null then raise exception 'invalid_challenge_difficulty';end if;
 v_first:=not exists(select 1 from public.attempt_mastery_rewards where user_id=a.user_id and challenge_id=a.challenge_id);
 v_points:=round(v_base*a.accuracy*case when v_first then 1.5 else 1 end)::int;
 insert into public.attempt_mastery_rewards(attempt_id,user_id,challenge_id,mastery_points,first_clear) values(a.id,a.user_id,a.challenge_id,v_points,v_first);
 update public.user_rank_stats set mastery_points=mastery_points+v_points,updated_at=now() where user_id=a.user_id returning mastery_points into v_total;
 return jsonb_build_object('awarded',true,'mastery_points',v_points,'first_clear',v_first,'total_mastery_points',v_total);
end $$;

create or replace function public.check_and_grant_rank_reward(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_points int;v_tier text;v_balance int;v_credits int;v_rewards jsonb;
begin
 perform 1 from public.profiles where id=p_user_id and status='active' and role='developer' for share;
 if not found then return jsonb_build_object('awarded',false,'reason','user_not_ranked');end if;
 insert into public.user_rank_stats(user_id) values(p_user_id) on conflict do nothing;
 perform 1 from public.user_rank_stats where user_id=p_user_id for update;
 select competitive_points,tier into v_points,v_tier from public.competitive_leaderboard where user_id=p_user_id;
 if not exists(select 1 from public.attempt_mastery_rewards where user_id=p_user_id) and not exists(select 1 from public.competitive_duel_results where player_a=p_user_id or player_b=p_user_id) then return jsonb_build_object('awarded',false,'reason','no_trusted_result','tier',v_tier);end if;
 insert into public.credit_wallets(user_id) values(p_user_id) on conflict do nothing;
 select balance into v_balance from public.credit_wallets where user_id=p_user_id for update;
 with inserted as (
 insert into public.user_rank_rewards(user_id,tier,credits_awarded)
 select p_user_id,m.tier,m.credits from (values('Bronze',0,100),('Silver',1200,250),('Gold',1500,500),('Platinum',1800,1000),('Diamond',2200,2500),('Master',2600,5000)) m(tier,points,credits)
 where m.points<=v_points on conflict(user_id,tier) do nothing returning tier,credits_awarded)
 select coalesce(sum(credits_awarded),0)::int,coalesce(jsonb_agg(jsonb_build_object('tier',tier,'credits_awarded',credits_awarded) order by credits_awarded),'[]'::jsonb) into v_credits,v_rewards from inserted;
 if v_credits>0 then update public.credit_wallets set balance=balance+v_credits,updated_at=now() where user_id=p_user_id returning balance into v_balance;end if;
 update public.user_rank_stats set highest_tier=case when v_points>highest_points then v_tier else highest_tier end,highest_points=greatest(highest_points,v_points),updated_at=now() where user_id=p_user_id;
 return jsonb_build_object('awarded',v_credits>0,'tier',v_tier,'credits_awarded',v_credits,'new_balance',v_balance,'rewards',v_rewards);
end $$;

revoke all on function public.grant_attempt_mastery(uuid),public.check_and_grant_rank_reward(uuid),public.apply_competitive_duel(uuid),public.competitive_rankings(text,text,text,int,int,uuid) from public,anon,authenticated;
grant execute on function public.grant_attempt_mastery(uuid),public.check_and_grant_rank_reward(uuid),public.apply_competitive_duel(uuid),public.competitive_rankings(text,text,text,int,int,uuid) to service_role;

-- Deliver the cache notification only if the entire recovery commits.
notify pgrst, 'reload schema';
commit;
