-- DEV DATABASE ONLY. Every fixture and reward rolls back.
begin;
set local statement_timeout='30s';
create function pg_temp.rank_assert(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end $$;
select pg_temp.rank_assert(to_regprocedure('public.apply_competitive_duel(uuid)') is not null,'duel RPC exists');
select pg_temp.rank_assert(not has_function_privilege('anon','public.check_and_grant_rank_reward(uuid)','EXECUTE') and not has_function_privilege('authenticated','public.apply_competitive_duel(uuid)','EXECUTE'),'rating and reward writes service only');
select pg_temp.rank_assert(not has_table_privilege('anon','public.competitive_leaderboard','SELECT') and not has_table_privilege('authenticated','public.dev_scores','SELECT'),'views cannot bypass privacy');
