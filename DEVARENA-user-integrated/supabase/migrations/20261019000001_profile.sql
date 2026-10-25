-- T12: profile_technologies join table and atomic update_profile() RPC
begin;
set local lock_timeout = '10s';

create table if not exists public.profile_technologies (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, technology_id)
);

alter table public.profile_technologies enable row level security;

revoke all on public.profile_technologies from public, anon, authenticated;
grant select on public.profile_technologies to anon, authenticated;
grant all on public.profile_technologies to service_role;

do $$
declare pol record;
begin
  for pol in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'profile_technologies'
  loop
    execute format('drop policy %I on public.profile_technologies', pol.policyname);
  end loop;
end;
$$;

create policy select_public on public.profile_technologies for select to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_technologies.profile_id
      and p.visibility = 'public'
      and p.status = 'active'
  ));

create policy select_own on public.profile_technologies for select to authenticated
  using (profile_id = (select auth.uid()));

create policy select_admin on public.profile_technologies for select to authenticated
  using ((select private.is_admin()));

create or replace function public.update_profile(
  p_id uuid,
  p_patch jsonb default '{}'::jsonb,
  p_technology_ids uuid[] default null
) returns setof public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  -- 1. Update whitelisted profile columns
  update public.profiles set
    username = case when v_patch ? 'username' and jsonb_typeof(v_patch -> 'username') = 'string'
      then btrim(v_patch ->> 'username') else username end,
    bio = case when v_patch ? 'bio'
      then case when jsonb_typeof(v_patch -> 'bio') = 'null' then null
                when jsonb_typeof(v_patch -> 'bio') = 'string' then btrim(v_patch ->> 'bio')
                else bio end
      else bio end,
    country = case when v_patch ? 'country'
      then case when jsonb_typeof(v_patch -> 'country') = 'null' then null
                when jsonb_typeof(v_patch -> 'country') = 'string' then upper(btrim(v_patch ->> 'country'))
                else country end
      else country end,
    institution = case when v_patch ? 'institution'
      then case when jsonb_typeof(v_patch -> 'institution') = 'null' then null
                when jsonb_typeof(v_patch -> 'institution') = 'string' then btrim(v_patch ->> 'institution')
                else institution end
      else institution end,
    visibility = case when v_patch ? 'visibility' and jsonb_typeof(v_patch -> 'visibility') = 'string'
      then (v_patch ->> 'visibility') else visibility end,
    avatar_url = case when v_patch ? 'avatar_url'
      then case when jsonb_typeof(v_patch -> 'avatar_url') = 'null' then null
                when jsonb_typeof(v_patch -> 'avatar_url') = 'string' then (v_patch ->> 'avatar_url')
                else avatar_url end
      else avatar_url end,
    updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Profile % not found', p_id using errcode = 'P0002';
  end if;

  -- 2. Replace technologies atomically if array is supplied
  if p_technology_ids is not null then
    delete from public.profile_technologies where profile_id = p_id;
    if array_length(p_technology_ids, 1) > 0 then
      insert into public.profile_technologies (profile_id, technology_id)
      select distinct p_id, unnest(p_technology_ids);
    end if;
  end if;

  return query select * from public.profiles where id = p_id;
end;
$$;

revoke all on function public.update_profile(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.update_profile(uuid, jsonb, uuid[]) to service_role;

commit;
