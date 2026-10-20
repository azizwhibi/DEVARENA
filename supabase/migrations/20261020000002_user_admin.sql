-- Migration: 20261020000002_user_admin.sql
-- Fonctions PL/pgSQL pour la gestion des utilisateurs (rôles et statuts) avec audit logging
begin;
set local lock_timeout = '10s';

-- 1. admin_set_role: Modification de rôle avec contrôles de sécurité stricts
create or replace function public.admin_set_role(
  target_user_id uuid,
  new_role text,
  caller_id uuid
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_old_role text;
  v_admin_count int;
begin
  -- Vérifie que caller_id a le rôle 'admin'
  if caller_id is not null and not exists (
    select 1 from public.profiles
    where id = caller_id and role = 'admin' and status = 'active'
  ) then
    raise exception 'Caller must be an active administrator' using errcode = '42501';
  end if;

  -- Empêche l'auto-rétrogradation
  if caller_id is not null and caller_id = target_user_id then
    raise exception 'Cannot change own role' using errcode = 'P0001';
  end if;

  -- Validation du rôle
  if new_role not in ('admin', 'developer', 'recruiter') then
    raise exception 'Invalid role: %', new_role using errcode = '22023';
  end if;

  -- Verrouillage de la ligne cible
  select role into v_old_role from public.profiles where id = target_user_id for update;
  if not found then
    raise exception 'Profile % not found', target_user_id using errcode = 'P0002';
  end if;

  -- Empêche la rétrogradation si target_user_id est le dernier administrateur actif
  if v_old_role = 'admin' and new_role <> 'admin' then
    perform 1 from public.profiles where role = 'admin' and status = 'active' for update;
    select count(*) into v_admin_count from public.profiles where role = 'admin' and status = 'active';
    if v_admin_count <= 1 then
      raise exception 'Cannot demote the last admin' using errcode = 'P0001';
    end if;
  end if;

  -- Mise à jour du rôle
  update public.profiles set role = new_role, updated_at = now() where id = target_user_id;

  -- Traçabilité dans public.audit_log
  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    caller_id,
    target_user_id,
    'admin.role_changed',
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', new_role)
  );

  return query select * from public.profiles where id = target_user_id;
end;
$$;

-- Alias de compatibilité p_actor, p_target, p_role
create or replace function public.admin_set_role(
  p_actor uuid,
  p_target uuid,
  p_role text
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
begin
  return query select * from public.admin_set_role(p_target, p_role, p_actor);
end;
$$;

revoke all on function public.admin_set_role(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_role(uuid, text, uuid) to service_role;

revoke all on function public.admin_set_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_role(uuid, uuid, text) to service_role;

-- 2. admin_set_status: Suspension / réactivation d'utilisateur
create or replace function public.admin_set_status(
  target_user_id uuid,
  new_status text,
  caller_id uuid,
  reason text default 'Administrative status update'
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_old_role text;
  v_old_status text;
  v_trimmed_reason text := btrim(coalesce(reason, ''));
  v_active_admin_count int;
begin
  -- Vérifie que caller_id a le rôle 'admin'
  if caller_id is not null and not exists (
    select 1 from public.profiles
    where id = caller_id and role = 'admin' and status = 'active'
  ) then
    raise exception 'Caller must be an active administrator' using errcode = '42501';
  end if;

  -- Empêche l'auto-suspension
  if caller_id is not null and caller_id = target_user_id then
    raise exception 'Cannot change own status' using errcode = 'P0001';
  end if;

  -- Validation du statut
  if new_status not in ('active', 'suspended') then
    raise exception 'Invalid status: %', new_status using errcode = '22023';
  end if;

  -- Verrouillage de la ligne cible
  select role, status into v_old_role, v_old_status from public.profiles where id = target_user_id for update;
  if not found then
    raise exception 'Profile % not found', target_user_id using errcode = 'P0002';
  end if;

  -- Empêche la suspension du dernier administrateur actif
  if v_old_role = 'admin' and new_status = 'suspended' then
    perform 1 from public.profiles where role = 'admin' and status = 'active' for update;
    select count(*) into v_active_admin_count from public.profiles where role = 'admin' and status = 'active';
    if v_active_admin_count <= 1 then
      raise exception 'Cannot suspend the last active admin' using errcode = 'P0001';
    end if;
  end if;

  -- Mise à jour du statut
  update public.profiles set status = new_status, updated_at = now() where id = target_user_id;

  -- Traçabilité dans public.audit_log
  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    caller_id,
    target_user_id,
    'admin.status_changed',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', new_status, 'reason', v_trimmed_reason)
  );

  return query select * from public.profiles where id = target_user_id;
end;
$$;

-- Alias de compatibilité p_actor, p_target, p_status, p_reason
create or replace function public.admin_set_status(
  p_actor uuid,
  p_target uuid,
  p_status text,
  p_reason text
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
begin
  return query select * from public.admin_set_status(p_target, p_status, p_actor, p_reason);
end;
$$;

revoke all on function public.admin_set_status(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_status(uuid, text, uuid, text) to service_role;

revoke all on function public.admin_set_status(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_status(uuid, uuid, text, text) to service_role;

commit;
