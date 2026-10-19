-- DEV DATABASE ONLY. All fixtures and assertions roll back.
begin;
set local statement_timeout = '30s';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- 1. Verify permissions on admin_set_role() and admin_set_status()
select pg_temp.assert(
  has_function_privilege('anon', 'public.admin_set_role(uuid, uuid, text)', 'EXECUTE') = false,
  'anon must not have execute on admin_set_role');
select pg_temp.assert(
  has_function_privilege('authenticated', 'public.admin_set_role(uuid, uuid, text)', 'EXECUTE') = false,
  'authenticated must not have execute on admin_set_role');
select pg_temp.assert(
  has_function_privilege('service_role', 'public.admin_set_role(uuid, uuid, text)', 'EXECUTE') = true,
  'service_role must have execute on admin_set_role');

select pg_temp.assert(
  has_function_privilege('anon', 'public.admin_set_status(uuid, uuid, text, text)', 'EXECUTE') = false,
  'anon must not have execute on admin_set_status');
select pg_temp.assert(
  has_function_privilege('authenticated', 'public.admin_set_status(uuid, uuid, text, text)', 'EXECUTE') = false,
  'authenticated must not have execute on admin_set_status');
select pg_temp.assert(
  has_function_privilege('service_role', 'public.admin_set_status(uuid, uuid, text, text)', 'EXECUTE') = true,
  'service_role must have execute on admin_set_status');

-- 2. Create test fixtures
create temporary table admin_fixture (label text primary key, id uuid not null);
insert into admin_fixture values
  ('admin_1', gen_random_uuid()),
  ('admin_2', gen_random_uuid()),
  ('dev_1', gen_random_uuid());

insert into auth.users (id, email, raw_user_meta_data) values
  ((select id from admin_fixture where label = 'admin_1'), 'admin_1@test.devarena', '{"username":"admin_one"}'::jsonb),
  ((select id from admin_fixture where label = 'admin_2'), 'admin_2@test.devarena', '{"username":"admin_two"}'::jsonb),
  ((select id from admin_fixture where label = 'dev_1'), 'dev_1@test.devarena', '{"username":"dev_one"}'::jsonb);

-- Set roles
update public.profiles set role = 'admin' where id in (
  select id from admin_fixture where label in ('admin_1', 'admin_2')
);

-- 3. Promote dev_1 to admin
perform public.admin_set_role(
  (select id from admin_fixture where label = 'admin_1'),
  (select id from admin_fixture where label = 'dev_1'),
  'admin'
);

select pg_temp.assert(
  (select role = 'admin' from public.profiles where id = (select id from admin_fixture where label = 'dev_1')),
  'dev_1 promoted to admin');

select pg_temp.assert(
  (select count(*) = 1 from public.audit_log
   where actor_id = (select id from admin_fixture where label = 'admin_1')
     and target_id = (select id from admin_fixture where label = 'dev_1')
     and action = 'user.role_changed'
     and "before" ->> 'role' = 'developer'
     and "after" ->> 'role' = 'admin'),
  'audit_log records role promotion');

-- 4. Demote dev_1 back to developer (allowed because admin_1 and admin_2 still exist)
perform public.admin_set_role(
  (select id from admin_fixture where label = 'admin_1'),
  (select id from admin_fixture where label = 'dev_1'),
  'developer'
);

select pg_temp.assert(
  (select role = 'developer' from public.profiles where id = (select id from admin_fixture where label = 'dev_1')),
  'dev_1 demoted back to developer');

-- 5. Self-demotion must fail
do $$
declare
  caught_self boolean := false;
  admin_1_id uuid := (select id from admin_fixture where label = 'admin_1');
begin
  begin
    perform public.admin_set_role(admin_1_id, admin_1_id, 'developer');
  exception when others then
    if sqlerrm like '%Cannot change own role%' then caught_self := true; end if;
  end;
  if not caught_self then raise exception 'Self-demotion did not raise expected error'; end if;
end;
$$;

-- 6. Last-admin demotion must fail
-- Demote admin_2 first
perform public.admin_set_role(
  (select id from admin_fixture where label = 'admin_1'),
  (select id from admin_fixture where label = 'admin_2'),
  'developer'
);

-- Now only admin_1 is admin. Attempting to demote admin_1 as any actor (e.g. system or service) must fail.
do $$
declare
  caught_last_admin boolean := false;
  admin_1_id uuid := (select id from admin_fixture where label = 'admin_1');
  dev_1_id uuid := (select id from admin_fixture where label = 'dev_1');
begin
  begin
    perform public.admin_set_role(dev_1_id, admin_1_id, 'developer');
  exception when others then
    if sqlerrm like '%Cannot demote the last admin%' then caught_last_admin := true; end if;
  end;
  if not caught_last_admin then raise exception 'Demoting last admin did not raise expected error'; end if;
end;
$$;

-- 7. Suspend user with reason
perform public.admin_set_status(
  (select id from admin_fixture where label = 'admin_1'),
  (select id from admin_fixture where label = 'dev_1'),
  'suspended',
  'Terms of Service violation'
);

select pg_temp.assert(
  (select status = 'suspended' from public.profiles where id = (select id from admin_fixture where label = 'dev_1')),
  'dev_1 suspended');

select pg_temp.assert(
  (select count(*) = 1 from public.audit_log
   where actor_id = (select id from admin_fixture where label = 'admin_1')
     and target_id = (select id from admin_fixture where label = 'dev_1')
     and action = 'user.status_changed'
     and "before" ->> 'status' = 'active'
     and "after" ->> 'status' = 'suspended'
     and "after" ->> 'reason' = 'Terms of Service violation'),
  'audit_log records status suspension with reason');

-- 8. Reactivate user
perform public.admin_set_status(
  (select id from admin_fixture where label = 'admin_1'),
  (select id from admin_fixture where label = 'dev_1'),
  'active',
  'Appeal accepted'
);

select pg_temp.assert(
  (select status = 'active' from public.profiles where id = (select id from admin_fixture where label = 'dev_1')),
  'dev_1 reactivated');

-- 9. Empty reason must fail
do $$
declare
  caught_reason boolean := false;
  admin_1_id uuid := (select id from admin_fixture where label = 'admin_1');
  dev_1_id uuid := (select id from admin_fixture where label = 'dev_1');
begin
  begin
    perform public.admin_set_status(admin_1_id, dev_1_id, 'suspended', '   ');
  exception when others then
    if sqlerrm like '%Reason is required%' then caught_reason := true; end if;
  end;
  if not caught_reason then raise exception 'Suspending without reason did not fail'; end if;
end;
$$;

-- 10. Self-suspension must fail
do $$
declare
  caught_self_suspend boolean := false;
  admin_1_id uuid := (select id from admin_fixture where label = 'admin_1');
begin
  begin
    perform public.admin_set_status(admin_1_id, admin_1_id, 'suspended', 'Mistake');
  exception when others then
    if sqlerrm like '%Cannot change own status%' then caught_self_suspend := true; end if;
  end;
  if not caught_self_suspend then raise exception 'Self-suspension did not fail'; end if;
end;
$$;

-- 11. Suspending the last active admin must fail
do $$
declare
  caught_last_admin_suspend boolean := false;
  admin_1_id uuid := (select id from admin_fixture where label = 'admin_1');
  dev_1_id uuid := (select id from admin_fixture where label = 'dev_1');
begin
  begin
    perform public.admin_set_status(dev_1_id, admin_1_id, 'suspended', 'Attacking');
  exception when others then
    if sqlerrm like '%Cannot suspend the last active admin%' then caught_last_admin_suspend := true; end if;
  end;
  if not caught_last_admin_suspend then raise exception 'Suspending last admin did not fail'; end if;
end;
$$;

-- 12. Verify audit log contains NO PII
select pg_temp.assert(
  not exists (
    select 1 from public.audit_log
    where "before"::text like '%@%' or "after"::text like '%@%'
       or "before"::text like '%admin_one%' or "after"::text like '%admin_one%'
  ),
  'audit_log contains no emails or usernames (UUID and roles/reasons only)');

rollback;
