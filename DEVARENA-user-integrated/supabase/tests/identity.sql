-- DEV DATABASE ONLY. All fixtures and assertions roll back, including on failure.
begin;
set local statement_timeout = '30s';
-- Synthetic metadata below has no physical files. Supabase's deletion guard needs
-- this transaction-local opt-in to test DELETE RLS and remove those fixtures.
-- Actual application files must always be removed through Storage API.
set local storage.allow_delete_query = 'true';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- Random IDs/emails prevent collisions with existing dev accounts.
create temporary table identity_fixture (label text primary key, id uuid not null);
insert into identity_fixture values
  ('alice', gen_random_uuid()), ('bob', gen_random_uuid()),
  ('admin', gen_random_uuid()), ('suspended', gen_random_uuid()),
  ('malformed', gen_random_uuid()), ('fallback', gen_random_uuid()),
  ('collision_limit', gen_random_uuid()),
  ('challenge', gen_random_uuid()), ('skill', gen_random_uuid()),
  ('attempt', gen_random_uuid()), ('audit', gen_random_uuid());
grant select on identity_fixture to anon, authenticated, service_role;

insert into auth.users (id, email, raw_user_meta_data)
select id, id::text || '@identity.devarena.test',
  jsonb_build_object('username', 'test_' || replace(id::text, '-', ''),
    'role', 'admin', 'status', 'suspended', 'visibility', 'private',
    'avatar_url', 'https://avatars.githubusercontent.com/test')
from identity_fixture where label = 'alice';

insert into auth.users (id, email, raw_user_meta_data)
select f.id, f.id::text || '@identity.devarena.test',
  jsonb_build_object('user_name', p.username, 'visibility', 'invalid',
    'picture', 'https://lh3.googleusercontent.com/test')
from identity_fixture f cross join public.profiles p
where f.label = 'bob' and p.id = (select id from identity_fixture where label = 'alice');

insert into auth.users (id, email, raw_user_meta_data)
select id, id::text || '@identity.devarena.test',
  case label
    when 'malformed' then '{"username":{},"avatar_url":"javascript:alert(1)","visibility":[]}'::jsonb
    when 'fallback' then jsonb_build_object('preferred_username', 'preferred_' || left(id::text, 8))
    else null
  end
from identity_fixture where label in ('admin', 'suspended', 'malformed', 'fallback');

select pg_temp.assert(
  (select count(*) = 6 from public.profiles where id in (select id from identity_fixture)),
  'each auth signup creates exactly one profile');
select pg_temp.assert(
  not exists (select 1 from public.profiles where id in (select id from identity_fixture)
    and (role <> 'developer' or status <> 'active' or username !~ '^[A-Za-z0-9_]{3,24}$')),
  'metadata cannot escalate role/status and all usernames are valid');
select pg_temp.assert(
  (select b.username ~ ('^' || left(a.username, 19) || '_[0-9a-f]{4}$')
    and lower(a.username) <> lower(b.username)
    and b.visibility = 'public' and b.avatar_url like 'https://lh3.googleusercontent.com/%'
   from public.profiles a cross join public.profiles b
   where a.id = (select id from identity_fixture where label = 'alice')
   and b.id = (select id from identity_fixture where label = 'bob')),
  'OAuth collision is suffixed and invalid visibility defaults to public');
select pg_temp.assert(
  (select avatar_url is null and visibility = 'public' and username = 'user_' || left(id::text, 8)
   from public.profiles where id = (select id from identity_fixture where label = 'malformed')),
  'malformed metadata cannot break signup or publish an unsafe avatar');
select pg_temp.assert(
  (select username = 'preferred_' || left(id::text, 8)
   from public.profiles where id = (select id from identity_fixture where label = 'fallback')),
  'preferred_username fallback is honored');

-- Queue eleven colliding candidates. The signup trigger must stop trying them
-- after ten attempts and insert the UUID-based fallback instead.
create temporary sequence identity_collision_sequence;
create function pg_temp.force_username_collisions() returns trigger
language plpgsql as $$
begin
  if new.id = (select id from identity_fixture where label = 'collision_limit')
    and new.username <> 'user_' || left(replace(new.id::text, '-', ''), 19)
    and nextval('identity_collision_sequence') <= 11 then
    new.username := (select username from public.profiles
      where id = (select id from identity_fixture where label = 'alice'));
  end if;
  return new;
end;
$$;
create trigger identity_test_force_collisions before insert on public.profiles
  for each row execute function pg_temp.force_username_collisions();
insert into auth.users (id, email, raw_user_meta_data)
select id, id::text || '@identity.devarena.test', '{"username":"collision_candidate"}'
from identity_fixture where label = 'collision_limit';
select pg_temp.assert(
  (select username = 'user_' || left(replace(id::text, '-', ''), 19)
   from public.profiles where id = (select id from identity_fixture where label = 'collision_limit'))
  and currval('identity_collision_sequence') = 10,
  'eleven forced collisions cannot prevent signup: fallback after ten attempts');
drop trigger identity_test_force_collisions on public.profiles;

select pg_temp.assert(
  not exists (
    select 1 from unnest(array['anon', 'authenticated']) as r(role_name)
    cross join unnest(array['technologies', 'skills', 'challenges', 'attempts',
      'user_skill_progress', 'user_skill_history', 'ai_recommendations']) as t(table_name)
    where has_table_privilege(r.role_name, 'public.' || t.table_name, 'select,insert,update,delete')
  ), 'baseline tables have no client table privileges');

update public.profiles set role = 'admin' where id = (select id from identity_fixture where label = 'admin');
update public.profiles set status = 'suspended' where id = (select id from identity_fixture where label = 'suspended');
update public.profiles set institution = '  Ecole   Dev  ', updated_at = '2000-01-01'
where id = (select id from identity_fixture where label = 'alice');
select pg_temp.assert(
  (select institution_key = 'ECOLE DEV' and updated_at > '2000-01-01'
   from public.profiles where id = (select id from identity_fixture where label = 'alice')),
  'institution normalization and updated_at are database maintained');
update auth.users set email = 'changed-' || id::text || '@identity.devarena.test'
where id = (select id from identity_fixture where label = 'alice');
select pg_temp.assert(
  (select p.email = u.email from public.profiles p join auth.users u using (id)
   where p.id = (select id from identity_fixture where label = 'alice')),
  'auth email changes synchronize profiles');

do $$
begin
  begin
    update public.profiles set username = upper((select username from public.profiles
      where id = (select id from identity_fixture where label = 'alice')))
    where id = (select id from identity_fixture where label = 'bob');
    raise exception 'case-insensitive username duplicate permitted';
  exception when unique_violation then null; end;
  begin
    update public.profiles set email = upper((select email from public.profiles
      where id = (select id from identity_fixture where label = 'alice')))
    where id = (select id from identity_fixture where label = 'bob');
    raise exception 'case-insensitive email duplicate permitted';
  exception when unique_violation then null; end;
  begin
    update public.profiles set bio = repeat('x', 281);
    raise exception 'oversized bio permitted';
  exception when check_violation then null; end;
  begin
    update public.profiles set country = 'zz';
    raise exception 'lowercase country permitted';
  exception when check_violation then null; end;
  begin
    update public.profiles set institution = repeat('x', 121);
    raise exception 'oversized institution permitted';
  exception when check_violation then null; end;
end;
$$;
select pg_temp.assert(
  not exists (select 1 from pg_catalog.pg_attribute a
    where a.attrelid = 'public.profiles'::regclass and a.attnum > 0 and not a.attisdropped
    and (has_column_privilege('authenticated', 'public.profiles', a.attname, 'UPDATE')
      or has_column_privilege('authenticated', 'public.profiles', a.attname, 'INSERT'))),
  'authenticated has no write grant on any profile column');
select pg_temp.assert(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scrub_profile_attempts()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.scrub_profile_attempts()', 'EXECUTE'),
  'privileged trigger functions cannot be invoked by API users');

set local role anon;
select pg_temp.assert(
  (select count(id) = 0 from public.profiles
   where id in (select id from identity_fixture where label in ('alice', 'suspended'))),
  'anon cannot read private or suspended profiles');
select pg_temp.assert(
  (select count(id) = 1 from public.profiles where id = (select id from identity_fixture where label = 'bob')),
  'anon can read public active profiles');
do $$
begin
  begin perform email from public.profiles; raise exception 'anon read email';
  exception when insufficient_privilege then null; end;
  begin perform status from public.profiles; raise exception 'anon read status';
  exception when insufficient_privilege then null; end;
  begin perform * from public.audit_log; raise exception 'anon read audit log';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', (select id::text from identity_fixture where label = 'alice'), true);
set local role authenticated;
select pg_temp.assert(
  (select count(id) = 1 from public.profiles where id = (select id from identity_fixture where label = 'alice')),
  'authenticated user sees their own private profile');
do $$
begin
  begin update public.profiles set role = 'admin'; raise exception 'user mutated role';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set username = 'hacked'; raise exception 'user mutated profile';
  exception when insufficient_privilege then null; end;
  begin insert into public.profiles (id, email, username) values (gen_random_uuid(), 'bad@example.test', 'bad');
    raise exception 'user inserted profile'; exception when insufficient_privilege then null; end;
  begin delete from public.profiles; raise exception 'user deleted profile';
  exception when insufficient_privilege then null; end;
  begin insert into public.audit_log (action) values ('account.deleted'); raise exception 'user forged audit';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', (select id::text from identity_fixture where label = 'admin'), true);
set local role authenticated;
select pg_temp.assert(
  (select count(id) = 1 from public.profiles where id = (select id from identity_fixture where label = 'alice')),
  'active admin reads private profiles without recursive RLS');
reset role;
update public.profiles set status = 'suspended' where id = (select id from identity_fixture where label = 'admin');
set local role authenticated;
select pg_temp.assert(
  (select count(id) = 0 from public.profiles where id = (select id from identity_fixture where label = 'alice')),
  'suspended admin loses elevated reads immediately');
reset role;

-- Prove a permissive policy from another module cannot open the avatar bucket.
create policy identity_test_broad_storage on storage.objects for all to authenticated using (true) with check (true);
select set_config('request.jwt.claim.sub', (select id::text from identity_fixture where label = 'alice'), true);
set local role authenticated;
insert into storage.objects (bucket_id, name, owner_id)
select 'avatars', id::text || '/test.png', id::text from identity_fixture where label = 'alice';
update storage.objects set metadata = '{"test":"updated"}'
where bucket_id = 'avatars' and name = (select id::text || '/test.png' from identity_fixture where label = 'alice');
select pg_temp.assert(
  (select metadata ->> 'test' = 'updated' from storage.objects where bucket_id = 'avatars'
   and name = (select id::text || '/test.png' from identity_fixture where label = 'alice')),
  'avatar owner can read and update their own object');
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    select 'avatars', id::text || '/attack.png', id::text from identity_fixture where label = 'bob';
    raise exception 'cross-user avatar upload permitted';
  exception when insufficient_privilege then null; end;
  begin
    update storage.objects set name = (select id::text || '/moved.png' from identity_fixture where label = 'bob')
    where bucket_id = 'avatars' and name = (select id::text || '/test.png' from identity_fixture where label = 'alice');
    raise exception 'avatar moved to another user folder';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', (select id::text from identity_fixture where label = 'bob'), true);
set local role authenticated;
do $$
declare affected integer;
begin
  delete from storage.objects where bucket_id = 'avatars'
    and name = (select id::text || '/test.png' from identity_fixture where label = 'alice');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'cross-user avatar delete permitted'; end if;
end;
$$;
reset role;
select pg_temp.assert(
  (select public and file_size_limit = 2097152
    and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
    and cardinality(allowed_mime_types) = 3
   from storage.buckets where id = 'avatars'),
  'avatar bucket has a 2 MiB limit and exactly the approved MIME types');

insert into public.challenges (id, title, difficulty) select id, 'identity test', 'beginner' from identity_fixture where label = 'challenge';
insert into public.skills (id, name) select id, 'identity test' from identity_fixture where label = 'skill';
insert into public.attempts (id, user_id, challenge_id, accuracy, is_validated, submitted_code, metadata, duration_ms)
select a.id, u.id, c.id, 0.85, true, 'personal code', '{"answer":"personal text"}', 1234
from identity_fixture a cross join identity_fixture u cross join identity_fixture c
where a.label = 'attempt' and u.label = 'alice' and c.label = 'challenge';
insert into public.user_skill_progress (user_id, skill_id, level_score)
select u.id, s.id, 70 from identity_fixture u cross join identity_fixture s where u.label = 'alice' and s.label = 'skill';
insert into public.user_skill_history (user_id, skill_id, level_score, validated_attempts)
select u.id, s.id, 70, 1 from identity_fixture u cross join identity_fixture s where u.label = 'alice' and s.label = 'skill';
insert into public.ai_recommendations (user_id, content)
select id, '{"personal":"recommendation"}' from identity_fixture where label = 'alice';
set local role service_role;
insert into public.audit_log (id, actor_id, target_id, action)
select a.id, u.id, u.id, 'account.deleted' from identity_fixture a cross join identity_fixture u
where a.label = 'audit' and u.label = 'alice';
reset role;
do $$
begin
  begin
    delete from auth.users where id = (select id from identity_fixture where label = 'alice');
    raise exception 'deletion left avatar objects behind';
  exception when foreign_key_violation then null; end;
end;
$$;
-- SQL fixtures have no physical files. Real files MUST be removed through Storage API.
delete from storage.objects where bucket_id = 'avatars'
and name = (select id::text || '/test.png' from identity_fixture where label = 'alice');
delete from auth.users where id = (select id from identity_fixture where label = 'alice');
select pg_temp.assert(
  not exists (select 1 from public.profiles where id = (select id from identity_fixture where label = 'alice'))
  and not exists (select 1 from public.user_skill_progress where user_id = (select id from identity_fixture where label = 'alice'))
  and not exists (select 1 from public.user_skill_history where user_id = (select id from identity_fixture where label = 'alice'))
  and not exists (select 1 from public.ai_recommendations where user_id = (select id from identity_fixture where label = 'alice')),
  'auth deletion cascades all personal records');
select pg_temp.assert(
  (select user_id is null and submitted_code is null and metadata is null
    and accuracy = 0.85 and is_validated and duration_ms = 1234
    and challenge_id = (select id from identity_fixture where label = 'challenge')
   from public.attempts where id = (select id from identity_fixture where label = 'attempt')),
  'deletion anonymizes attempts and scrubs payloads while preserving analytics');
select pg_temp.assert(
  (select count(*) = 1 from public.audit_log where id = (select id from identity_fixture where label = 'audit')),
  'audit survives deletion without foreign keys');

rollback;
\echo 'identity SQL assertions passed (fixtures rolled back)'
