-- DEV DATABASE ONLY. All fixtures and assertions roll back.
begin;
set local statement_timeout = '30s';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- 1. Create fixtures
create temporary table test_users (
  label text primary key,
  id uuid not null
);

insert into test_users values
  ('dev_odd', gen_random_uuid()),
  ('dev_even', gen_random_uuid()),
  ('dev_empty', gen_random_uuid()),
  ('dev_private', gen_random_uuid()),
  ('dev_suspended', gen_random_uuid());

create temporary table test_skills (
  label text primary key,
  id uuid not null
);

insert into test_skills values
  ('skill_1', gen_random_uuid()),
  ('skill_2', gen_random_uuid()),
  ('skill_3', gen_random_uuid());

-- Insert skills
insert into public.skills (id, name, is_active) values
  ((select id from test_skills where label = 'skill_1'), 'Skill A', true),
  ((select id from test_skills where label = 'skill_2'), 'Skill B', true),
  ((select id from test_skills where label = 'skill_3'), 'Skill C', true);

-- Insert profiles
insert into public.profiles (id, email, username, role, status, visibility, country, institution) values
  ((select id from test_users where label = 'dev_odd'), 'odd@test.com', 'user_odd', 'developer', 'active', 'public', 'FR', 'Test University'),
  ((select id from test_users where label = 'dev_even'), 'even@test.com', 'user_even', 'developer', 'active', 'public', 'FR', 'Test University'),
  ((select id from test_users where label = 'dev_empty'), 'empty@test.com', 'user_empty', 'developer', 'active', 'public', 'DE', 'Other School'),
  ((select id from test_users where label = 'dev_private'), 'private@test.com', 'user_private', 'developer', 'active', 'private', 'FR', 'Test University'),
  ((select id from test_users where label = 'dev_suspended'), 'suspended@test.com', 'user_suspended', 'developer', 'suspended', 'public', 'FR', 'Test University');

-- Insert user skill progress
-- dev_odd: 3 skills [60, 80, 90] -> median 80
insert into public.user_skill_progress (user_id, skill_id, level_score, validated_attempts, status) values
  ((select id from test_users where label = 'dev_odd'), (select id from test_skills where label = 'skill_1'), 60, 1, 'intermediate'),
  ((select id from test_users where label = 'dev_odd'), (select id from test_skills where label = 'skill_2'), 80, 2, 'advanced'),
  ((select id from test_users where label = 'dev_odd'), (select id from test_skills where label = 'skill_3'), 90, 3, 'expert');

-- dev_even: 2 skills [60, 80] -> median 70
insert into public.user_skill_progress (user_id, skill_id, level_score, validated_attempts, status) values
  ((select id from test_users where label = 'dev_even'), (select id from test_skills where label = 'skill_1'), 60, 1, 'intermediate'),
  ((select id from test_users where label = 'dev_even'), (select id from test_skills where label = 'skill_2'), 80, 2, 'advanced');

-- dev_private: 2 skills [95, 95] -> median 95, but private
insert into public.user_skill_progress (user_id, skill_id, level_score, validated_attempts, status) values
  ((select id from test_users where label = 'dev_private'), (select id from test_skills where label = 'skill_1'), 95, 1, 'expert'),
  ((select id from test_users where label = 'dev_private'), (select id from test_skills where label = 'skill_2'), 95, 1, 'expert');

-- dev_suspended: 1 skill [100] -> suspended
insert into public.user_skill_progress (user_id, skill_id, level_score, validated_attempts, status) values
  ((select id from test_users where label = 'dev_suspended'), (select id from test_skills where label = 'skill_1'), 100, 1, 'expert');

-- Assertions: dev_scores view
select pg_temp.assert(
  (select dev_score from public.dev_scores where user_id = (select id from test_users where label = 'dev_odd')) = 80,
  'dev_odd median must be 80 for [60, 80, 90]');

select pg_temp.assert(
  (select tier from public.dev_scores where user_id = (select id from test_users where label = 'dev_odd')) = 'advanced',
  'dev_odd tier must be advanced for score 80');

select pg_temp.assert(
  (select dev_score from public.dev_scores where user_id = (select id from test_users where label = 'dev_even')) = 70,
  'dev_even median must be 70 for [60, 80]');

select pg_temp.assert(
  (select tier from public.dev_scores where user_id = (select id from test_users where label = 'dev_even')) = 'advanced',
  'dev_even tier must be advanced for score 70');

select pg_temp.assert(
  (select dev_score from public.dev_scores where user_id = (select id from test_users where label = 'dev_empty')) is null,
  'dev_empty dev_score must be null');

select pg_temp.assert(
  (select eligible from public.dev_scores where user_id = (select id from test_users where label = 'dev_empty')) = false,
  'dev_empty eligible must be false');

select pg_temp.assert(
  (select eligible from public.dev_scores where user_id = (select id from test_users where label = 'dev_private')) = false,
  'dev_private eligible must be false');

select pg_temp.assert(
  (select eligible from public.dev_scores where user_id = (select id from test_users where label = 'dev_suspended')) = false,
  'dev_suspended eligible must be false');

-- Assertions: leaderboard function excludes private/suspended and ranks dev_odd (80) ahead of dev_even (70)
select pg_temp.assert(
  not exists (select 1 from public.leaderboard('global') where user_id in (
    select id from test_users where label in ('dev_private', 'dev_suspended', 'dev_empty')
  )),
  'leaderboard must never return private, suspended, or 0-attempt users');

select pg_temp.assert(
  (select dev_score from public.leaderboard('country', 'FR', 1, 0)) >= 80,
  'top country leaderboard entry must have score >= 80');

rollback;
