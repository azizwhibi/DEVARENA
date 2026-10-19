-- DEV DATABASE ONLY. All fixtures and assertions roll back.
begin;
set local statement_timeout = '30s';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- 1. Verify permissions on update_profile()
select pg_temp.assert(
  has_function_privilege('anon', 'public.update_profile(uuid, jsonb, uuid[])', 'EXECUTE') = false,
  'anon must not have execute on update_profile');
select pg_temp.assert(
  has_function_privilege('authenticated', 'public.update_profile(uuid, jsonb, uuid[])', 'EXECUTE') = false,
  'authenticated must not have execute on update_profile');
select pg_temp.assert(
  has_function_privilege('service_role', 'public.update_profile(uuid, jsonb, uuid[])', 'EXECUTE') = true,
  'service_role must have execute on update_profile');

-- 2. Verify permissions on profile_technologies
select pg_temp.assert(
  has_table_privilege('anon', 'public.profile_technologies', 'SELECT') = true
  and has_table_privilege('anon', 'public.profile_technologies', 'INSERT') = false
  and has_table_privilege('anon', 'public.profile_technologies', 'UPDATE') = false
  and has_table_privilege('anon', 'public.profile_technologies', 'DELETE') = false,
  'anon has SELECT only on profile_technologies');

select pg_temp.assert(
  has_table_privilege('authenticated', 'public.profile_technologies', 'SELECT') = true
  and has_table_privilege('authenticated', 'public.profile_technologies', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.profile_technologies', 'UPDATE') = false
  and has_table_privilege('authenticated', 'public.profile_technologies', 'DELETE') = false,
  'authenticated has SELECT only on profile_technologies');

-- 3. Create test fixtures
create temporary table profile_fixture (label text primary key, id uuid not null);
insert into profile_fixture values
  ('user_a', gen_random_uuid()),
  ('user_b', gen_random_uuid()),
  ('tech_1', gen_random_uuid()),
  ('tech_2', gen_random_uuid());

insert into public.technologies (id, name, is_active) values
  ((select id from profile_fixture where label = 'tech_1'), 'TechTestOne', true),
  ((select id from profile_fixture where label = 'tech_2'), 'TechTestTwo', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ((select id from profile_fixture where label = 'user_a'), 'user_a@test.devarena', '{"username":"user_a_initial"}'::jsonb),
  ((select id from profile_fixture where label = 'user_b'), 'user_b@test.devarena', '{"username":"user_b_initial"}'::jsonb);

-- 4. Test update_profile succeeds
perform public.update_profile(
  (select id from profile_fixture where label = 'user_a'),
  '{"bio":"Hello world","country":"FR","institution":"42","visibility":"public"}'::jsonb,
  array[(select id from profile_fixture where label = 'tech_1'), (select id from profile_fixture where label = 'tech_2')]
);

select pg_temp.assert(
  (select bio = 'Hello world' and country = 'FR' and institution = '42' and visibility = 'public'
   from public.profiles where id = (select id from profile_fixture where label = 'user_a')),
  'update_profile updates profile fields');

select pg_temp.assert(
  (select count(*) = 2 from public.profile_technologies
   where profile_id = (select id from profile_fixture where label = 'user_a')),
  'update_profile links technologies');

-- 5. Test duplicate username raises 23505 and rolls back technology changes
do $$
declare
  caught_23505 boolean := false;
  user_a_id uuid := (select id from profile_fixture where label = 'user_a');
  tech_1_id uuid := (select id from profile_fixture where label = 'tech_1');
begin
  begin
    perform public.update_profile(
      user_a_id,
      '{"username":"user_b_initial"}'::jsonb, -- Collides with user_b
      array[]::uuid[] -- Attempts to wipe technologies
    );
  exception when unique_violation then
    caught_23505 := true;
  end;

  if not caught_23505 then
    raise exception 'update_profile with duplicate username did not raise unique_violation (23505)';
  end if;
end;
$$;

-- Assert nothing changed after the failed transaction block
select pg_temp.assert(
  (select username = 'user_a_initial' from public.profiles where id = (select id from profile_fixture where label = 'user_a')),
  'duplicate username keeps original username');
select pg_temp.assert(
  (select count(*) = 2 from public.profile_technologies where profile_id = (select id from profile_fixture where label = 'user_a')),
  'failed update preserves existing technology links');

-- 6. Test deleting a profile removes its technology rows (CASCADE)
delete from auth.users where id = (select id from profile_fixture where label = 'user_a');
select pg_temp.assert(
  (select count(*) = 0 from public.profile_technologies where profile_id = (select id from profile_fixture where label = 'user_a')),
  'deleting auth user / profile cascades to profile_technologies');

rollback;
