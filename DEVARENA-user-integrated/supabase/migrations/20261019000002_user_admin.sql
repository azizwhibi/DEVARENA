-- T19 & T20: atomic admin_set_role and admin_set_status RPCs with audit logging
begin;
set local lock_timeout = '10s';

create or replace function public.admin_set_role(
  p_actor uuid,
  p_target uuid,
  p_role text
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_old_role text;
  v_admin_count int;
begin
  if p_actor is not null and p_actor = p_target then
    raise exception 'Cannot change own role' using errcode = 'P0001';
  end if;

  if p_role not in ('admin', 'developer', 'recruiter') then
    raise exception 'Invalid role: %', p_role using errcode = '22023';
  end if;

  select role into v_old_role from public.profiles where id = p_target for update;
  if not found then
    raise exception 'Profile % not found', p_target using errcode = 'P0002';
  end if;

  if v_old_role = 'admin' and p_role <> 'admin' then
    perform 1 from public.profiles where role = 'admin' for update;
    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'Cannot demote the last admin' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_target;

  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    p_actor,
    p_target,
    'user.role_changed',
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_role)
  );

  return query select * from public.profiles where id = p_target;
end;
$$;

revoke all on function public.admin_set_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_role(uuid, uuid, text) to service_role;

create or replace function public.admin_set_status(
  p_actor uuid,
  p_target uuid,
  p_status text,
  p_reason text
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_old_role text;
  v_old_status text;
  v_trimmed_reason text := btrim(coalesce(p_reason, ''));
  v_active_admin_count int;
begin
  if v_trimmed_reason = '' then
    raise exception 'Reason is required' using errcode = 'P0001';
  end if;

  if p_actor is not null and p_actor = p_target then
    raise exception 'Cannot change own status' using errcode = 'P0001';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception 'Invalid status: %', p_status using errcode = '22023';
  end if;

  select role, status into v_old_role, v_old_status from public.profiles where id = p_target for update;
  if not found then
    raise exception 'Profile % not found', p_target using errcode = 'P0002';
  end if;

  if v_old_role = 'admin' and p_status = 'suspended' then
    perform 1 from public.profiles where role = 'admin' for update;
    select count(*) into v_active_admin_count from public.profiles where role = 'admin' and status = 'active';
    if v_active_admin_count <= 1 then
      raise exception 'Cannot suspend the last active admin' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles set status = p_status, updated_at = now() where id = p_target;

  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    p_actor,
    p_target,
    'user.status_changed',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status, 'reason', v_trimmed_reason)
  );

  return query select * from public.profiles where id = p_target;
end;
$$;

revoke all on function public.admin_set_status(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_status(uuid, uuid, text, text) to service_role;

commit;
