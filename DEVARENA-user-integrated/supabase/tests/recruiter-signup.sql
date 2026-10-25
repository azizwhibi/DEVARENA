-- DEV DATABASE ONLY.
-- Verifies 20261020000001_recruiter_signup.sql:
-- Ensures metadata 'role': 'recruiter' creates a recruiter profile,
-- while 'role': 'admin' creates a developer profile.

begin;
set local statement_timeout = '30s';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

create temporary table recruiter_fixture (label text primary key, id uuid not null);
insert into recruiter_fixture values
  ('recruiter_user', gen_random_uuid()),
  ('admin_attempt', gen_random_uuid());

insert into auth.users (id, email, raw_user_meta_data)
select id, id::text || '@recruiter.devarena.test',
  jsonb_build_object('username', 'rec_' || left(replace(id::text, '-', ''), 10),
    'role', 'recruiter', 'visibility', 'public')
from recruiter_fixture where label = 'recruiter_user';

insert into auth.users (id, email, raw_user_meta_data)
select id, id::text || '@recruiter.devarena.test',
  jsonb_build_object('username', 'fake_admin_' || left(replace(id::text, '-', ''), 8),
    'role', 'admin', 'visibility', 'private')
from recruiter_fixture where label = 'admin_attempt';

select pg_temp.assert(
  (select role = 'recruiter' from public.profiles where id = (select id from recruiter_fixture where label = 'recruiter_user')),
  'recruiter metadata creates profile with role recruiter');

select pg_temp.assert(
  (select role = 'developer' from public.profiles where id = (select id from recruiter_fixture where label = 'admin_attempt')),
  'admin metadata attempt falls back to developer role');

rollback;
