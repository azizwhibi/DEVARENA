-- DEV DATABASE ONLY. Every fixture and reward rolls back.
begin;
set local statement_timeout='30s';
create function pg_temp.rank_assert(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end $$;
select pg_temp.rank_assert(to_regprocedure('public.apply_competitive_duel(uuid)') is not null,'duel RPC exists');
select pg_temp.rank_assert(not has_function_privilege('anon','public.check_and_grant_rank_reward(uuid)','EXECUTE') and not has_function_privilege('authenticated','public.apply_competitive_duel(uuid)','EXECUTE'),'rating and reward writes service only');
select pg_temp.rank_assert(not has_table_privilege('anon','public.competitive_leaderboard','SELECT') and not has_table_privilege('authenticated','public.dev_scores','SELECT'),'views cannot bypass privacy');
-- Compile/execute both legacy branches even when no eligible fixture exists.
-- These read-only calls caught round(double precision, integer) in global scoring.
do $$
declare v_user uuid; v_technology text; v_score numeric; v_expected numeric;
begin
  select user_id,round(dev_score::numeric,2) into v_user,v_expected
    from public.dev_scores where eligible order by user_id limit 1;
  v_user:=coalesce(v_user,gen_random_uuid());
  select technology_id::text into v_technology from public.skills
    where technology_id is not null order by technology_id limit 1;
  v_technology:=coalesce(v_technology,gen_random_uuid()::text);
  perform count(*) from public.leaderboard('global',null,1,0);
  perform count(*) from public.leaderboard('technology',v_technology,1,0);
  select dev_score into v_score from public.my_rank(v_user,'global',null);
  if v_expected is not null then
    perform pg_temp.rank_assert(v_score=v_expected,'legacy own global score rounds to numeric');
  end if;
  perform count(*) from public.my_rank(v_user,'technology',v_technology);
  perform pg_temp.rank_assert(exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='dev_scores' and column_name='dev_score'
      and data_type='double precision'),'median view type stays unchanged');
  perform pg_temp.rank_assert(exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='competitive_duel_results' and column_name='margin_bonus_a')
    or to_regclass('public.competitive_duel_results') is null, 'margin_bonus_a column exists when table present');
  perform pg_temp.rank_assert(exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='competitive_duel_results' and column_name='margin_bonus_b')
    or to_regclass('public.competitive_duel_results') is null, 'margin_bonus_b column exists when table present');
end $$;
rollback;
